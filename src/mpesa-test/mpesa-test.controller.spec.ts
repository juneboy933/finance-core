import { Test, TestingModule } from '@nestjs/testing';
import { MpesaTestController } from './mpesa-test.controller';

describe('MpesaTestController', () => {
  let controller: MpesaTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MpesaTestController],
    }).compile();

    controller = module.get<MpesaTestController>(MpesaTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
