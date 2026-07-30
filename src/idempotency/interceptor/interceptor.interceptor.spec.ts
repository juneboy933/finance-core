import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyService } from '../idempotency.service';
import { ConfigModule } from '@nestjs/config';

describe('IdempotencyInterceptor', () => {
  let interceptor: IdempotencyInterceptor;
  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      providers: [
        IdempotencyInterceptor,
        {
          provide: IdempotencyService,
          useValue: {
            claim: jest.fn(),
            complete: jest.fn(),
          },
        },
      ],
    }).compile();

    interceptor = module.get<IdempotencyInterceptor>(IdempotencyInterceptor);
  });

  it('should be defined', () => {
    expect(interceptor).toBeDefined();
  });

  afterEach(async () => {
    await module.close();
  });
});
