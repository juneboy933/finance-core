import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterService } from '../rate-limiter.service';

interface AuthenticatedUser extends Request {
  user: { userId: string };
}

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedUser>();
    const identifier = request.user?.userId;
    if (!identifier)
      throw new HttpException(
        'RateLimiterGuard requires an authenticated request',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );

    const allowed = await this.rateLimiterService.checkRateLimit(identifier);
    if (!allowed) {
      throw new HttpException(
        'Too many requests. Please try again shortly',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }
}
