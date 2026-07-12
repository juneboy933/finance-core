import { Test, TestingModule } from '@nestjs/testing';
import { LedgerTestController } from './ledger-test.controller';

describe('LedgerTestController', () => {
  let controller: LedgerTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LedgerTestController],
    }).compile();

    controller = module.get<LedgerTestController>(LedgerTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
