import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { ConfigModule } from '@nestjs/config';

describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterAll(async () => {
    try {
      const redis = (service as any)?.redis;
      if (redis && typeof redis.disconnect === 'function') {
        await redis.disconnect();
      }
      if (redis && typeof redis.quit === 'function') {
        await redis.quit();
      }
    } catch (err) {
      // ignore cleanup errors
    }
  });
});
