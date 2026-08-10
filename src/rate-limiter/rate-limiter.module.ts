import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimiterGuard } from './rate-limiter/rate-limiter.guard';

@Module({
  providers: [RateLimiterService, RateLimiterGuard],
  exports: [RateLimiterService],
})
export class RateLimiterModule {}
