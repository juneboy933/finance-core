import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterController } from './rate-limiter.controller';
import { ConfigModule } from '@nestjs/config';
import { RateLimiterService } from './rate-limiter.service';

describe('RateLimiterController', () => {
  let controller: RateLimiterController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [RateLimiterController],
      providers: [
        {
          provide: RateLimiterService,
          useValue: { checkRateLimit: jest.fn().mockResolvedValue(true) },
        },
      ],
    }).compile();

    controller = module.get<RateLimiterController>(RateLimiterController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
