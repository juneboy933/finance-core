import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterUserDto } from './dto/register.user.dto';
import * as argon2 from 'argon2';
import { AccountType } from 'generated/prisma/enums';
import { LoginUserDto } from './dto/login.user.dto';
import { JwtService } from '@nestjs/jwt';
import { createHash } from 'crypto';
import { normalizePhone } from 'shared/phone.util';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterUserDto) {
    // Check if the user already exists
    const user = await this.prisma.user.findFirst({
      where: { OR: [{ email: dto.email }, { phone_number: dto.phone }] },
    });

    // If the user exists, throw an error
    if (user) {
      throw new ConflictException('User already exists');
    }
    // Hash the password
    const hashedPassword = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    const normalizedNumber = normalizePhone(dto.phone);

    // Create new user associated with an account if the user never existed
    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone_number: normalizedNumber,
          password: hashedPassword,
        },
        select: {
          id: true,
          email: true,
          phone_number: true,
          created_at: true,
          updated_at: true,
        },
      });

      await tx.account.create({
        data: {
          userId: newUser.id,
          accountType: AccountType.WALLET,
        },
      });

      return newUser;
    });

    return {
      message: 'User registered successfully',
      data: result,
    };
  }

  async login(dto: LoginUserDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // If user never exists throw an error
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // Compare password with hashed password
    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const tokenPayload = { sub: user.id };
    const accessToken = this.jwtService.sign(tokenPayload);
    const refreshToken = await this.issueRefreshToken(user.id);

    // Create a shallow copy and delete the property without creating an unused variable
    const userWithoutPassword = { ...user };
    delete (userWithoutPassword as { password?: string }).password;

    // If password is correct, return user data
    return {
      message: 'Login successful',
      data: userWithoutPassword,
      access_token: accessToken,
      refresh_token: refreshToken,
    };
  }

  private async issueRefreshToken(userId: string) {
    const refreshTokenPayload = { sub: userId };
    const refreshKey = process.env.JWT_REFRESH_KEY;
    if (!refreshKey) {
      throw new InternalServerErrorException(
        'Refresh key is not defined in environment variables',
      );
    }

    const refreshToken = this.jwtService.sign(refreshTokenPayload, {
      secret: refreshKey,
      expiresIn: '7d', // Set the expiration time for the refresh token
    });

    const hashedRefreshToken = createHash('sha256')
      .update(refreshToken)
      .digest('hex');

    await this.prisma.refreshToken.create({
      data: {
        userId: userId,
        hashedToken: hashedRefreshToken,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });

    return refreshToken;
  }

  async validateToken(token: string) {
    const incomingToken = createHash('sha256').update(token).digest('hex');

    const storedToken = await this.prisma.refreshToken.findUnique({
      where: { hashedToken: incomingToken },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (storedToken.revoked || storedToken.expires_at < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    return storedToken.userId;
  }

  async revokeRefreshToken(token: string) {
    const incomingToken = createHash('sha256').update(token).digest('hex');

    await this.validateToken(token);

    await this.prisma.refreshToken.update({
      where: { hashedToken: incomingToken },
      data: { revoked: true },
    });

    return {
      message: 'Refresh token revoked successfully',
    };
  }
}
