import { Test, TestingModule } from '@nestjs/testing';
import { ReconciliationController } from './reconciliation.controller';
import { ConfigModule } from '@nestjs/config';
import { ReconciliationService } from './reconciliation.service';

describe('ReconciliationController', () => {
  let controller: ReconciliationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [ReconciliationController],
      providers: [{ provide: ReconciliationService, useValue: {} }],
    }).compile();

    controller = module.get<ReconciliationController>(ReconciliationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
