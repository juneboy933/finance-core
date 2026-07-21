import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Request } from 'express';
import { RateLimiterService } from '../rate-limiter.service';

@Injectable()
export class RateLimiterGuard implements CanActivate {
  constructor(private readonly rateLimiterService: RateLimiterService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const body = request.body as { phoneNumber?: unknown } | undefined;
    const identifier =
      typeof body?.phoneNumber === 'string' ? body.phoneNumber : undefined;
    if (!identifier)
      throw new HttpException(
        'Phone number is required',
        HttpStatus.BAD_REQUEST,
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
