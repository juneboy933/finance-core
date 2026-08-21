import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const accessKey = process.env.JWT_ACCESS_KEY;
    if (!accessKey) {
      throw new InternalServerErrorException(
        'JWT_ACCESS_KEY is not defined in the environment variables',
      );
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: accessKey,
    });
  }

  validate(payload: { sub: string }) {
    return { userId: payload.sub };
  }
}
