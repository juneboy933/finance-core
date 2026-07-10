import { Test, TestingModule } from '@nestjs/testing';
import { IdempotencyTestController } from './idempotency-test.controller';

describe('IdempotencyTestController', () => {
  let controller: IdempotencyTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [IdempotencyTestController],
    }).compile();

    controller = module.get<IdempotencyTestController>(IdempotencyTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
