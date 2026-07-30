import { Test, TestingModule } from '@nestjs/testing';
import { MpesaTestController } from './mpesa-test.controller';
import { ConfigModule } from '@nestjs/config';
import { MpesaService } from 'mpesa/mpesa.service';

describe('MpesaTestController', () => {
  let controller: MpesaTestController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [MpesaTestController],
      providers: [
        {
          provide: MpesaService,
          useValue: {
            initiateSTKPush: jest.fn(),
            getAccessToken: jest.fn(),
            processCallback: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<MpesaTestController>(MpesaTestController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
