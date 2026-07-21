import { Controller, Post } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';

@Controller('rate-limiter')
export class RateLimiterController {
  constructor(private readonly rateLimitService: RateLimiterService) {}

  @Post('check')
  async check() {
    const allowed = this.rateLimitService.checkRateLimit('test-user');
    return allowed;
  }
}
