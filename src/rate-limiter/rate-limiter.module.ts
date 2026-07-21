import { Module } from '@nestjs/common';
import { RateLimiterService } from './rate-limiter.service';
import { RateLimiterController } from './rate-limiter.controller';
import { RateLimiterGuard } from './rate-limiter/rate-limiter.guard';

@Module({
  providers: [RateLimiterService, RateLimiterGuard],
  exports: [RateLimiterService],
  controllers: [RateLimiterController],
})
export class RateLimiterModule {}
