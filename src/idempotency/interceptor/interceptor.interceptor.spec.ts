import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../idempotency.service';
import { ConfigModule } from '@nestjs/config';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [IdempotencyInterceptor, IdempotencyService],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });
});
