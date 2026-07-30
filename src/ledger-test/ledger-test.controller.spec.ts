import { Test, TestingModule } from '@nestjs/testing';
import { LedgerTestController } from './ledger-test.controller';
import { ConfigModule } from '@nestjs/config';
import { LedgerService } from 'ledger/ledger.service';

describe('LedgerTestController', () => {
  let controller: LedgerTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [LedgerTestController],
      providers: [
        {
          provide: LedgerService,
          useValue: {},
        },
      ],
    }).compile();

    controller = module.get<LedgerTestController>(LedgerTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
