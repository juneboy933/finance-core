import { Test, TestingModule } from '@nestjs/testing';
import { RateLimiterService } from './rate-limiter.service';
import { ConfigModule } from '@nestjs/config';

jest.mock('ioredis', () => {
  const Redis = jest.fn().mockImplementation(() => ({
    disconnect: jest.fn(),
    eval: jest.fn(),
  }));

  return { __esModule: true, default: Redis };
});

describe('RateLimiterService', () => {
  let service: RateLimiterService;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [RateLimiterService],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterEach(async () => {
    await module.close();
  });
});
