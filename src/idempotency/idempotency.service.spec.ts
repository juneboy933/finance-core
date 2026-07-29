import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyService } from './idempotency.service';
import { ConfigModule } from '@nestjs/config';

describe('IdempotencyService', () => {
  let service: IdempotencyService;

  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [IdempotencyService],
    }).compile();

    service = module.get<IdempotencyService>(IdempotencyService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  afterAll(async () => {
    // Ensure Redis client is disconnected to avoid open handles
    try {
      const redis = (service as any)?.redis;
      if (redis && typeof redis.disconnect === 'function') {
        await redis.disconnect();
      }
      if (redis && typeof redis.quit === 'function') {
        await redis.quit();
      }
    } catch (err) {
      // swallow errors during test cleanup
    }
  });
  afterAll(async () => {
    if (module && typeof (module as any).close === 'function') {
      await (module as any).close();
    }
  });
});
