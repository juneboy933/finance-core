import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyTestController } from './idempotency-test.controller';
import { ConfigModule } from '@nestjs/config';
import { IdempotencyInterceptor } from 'idempotency/interceptor/idempotency.interceptor';
import { IdempotencyService } from 'idempotency/idempotency.service';

describe('IdempotencyTestController', () => {
  let controller: IdempotencyTestController;

  let module: TestingModule;

  beforeEach(async () => {
    module = await Test.createTestingModule({
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

  afterAll(async () => {
    await module.close();
  });
});
