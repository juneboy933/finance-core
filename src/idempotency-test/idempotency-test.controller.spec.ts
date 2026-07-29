import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyTestController } from './idempotency-test.controller';
import { ConfigModule } from '@nestjs/config';
import { IdempotencyInterceptor } from 'idempotency/interceptor/idempotency.interceptor';
import { IdempotencyService } from 'idempotency/idempotency.service';

describe('IdempotencyTestController', () => {
  let controller: IdempotencyTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [IdempotencyTestController],
      providers: [
        {
          provide: IdempotencyInterceptor,
          useValue: {},
        },
        { provide: IdempotencyService, useValue: {} },
      ],
    }).compile();

    controller = module.get<IdempotencyTestController>(
      IdempotencyTestController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
