import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../idempotency.service';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [IdempotencyInterceptor, IdempotencyService],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
});
