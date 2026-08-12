import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from 'prisma/prisma.service';
import { RegisterUserDto } from './dto/register.user.dto';
import * as argon2 from 'argon2';
import { AccountType } from 'generated/prisma/enums';
import { LoginUserDto } from './dto/login.user.dto';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

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

    // Create new user associated with an account if the user never existed
    const result = await this.prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: dto.email,
          phone_number: dto.phone,
          password: hashedPassword,
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

    const { password, ...userWithoutPassword } = result;

    return {
      message: 'User registered successfully',
      data: userWithoutPassword,
    };
  }

  async login(dto: LoginUserDto) {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    // If user never exists throw an error
    if (!user) {
      throw new NotFoundException('Invalid email or password');
    }

    // Compare password with hashed password
    const isPasswordValid = await argon2.verify(user.password, dto.password);

    if (!isPasswordValid) {
      throw new BadRequestException('Invalid email or password');
    }

    const { password, ...userWithoutPassword } = user;
    // If password is correct, return user data
    return {
      message: 'Login successful',
      data: userWithoutPassword,
    };
  }
}
