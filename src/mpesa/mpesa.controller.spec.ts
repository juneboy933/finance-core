import { Test, TestingModule } from '@nestjs/testing';
import { MpesaController } from './mpesa.controller';
import { ConfigModule } from '@nestjs/config';
import { MpesaService } from './mpesa.service';
import { MpesaCallbackIdempotencyInterceptor } from 'idempotency/interceptor/mpesaCallback.idempotency.interceptor';
import { IdempotencyService } from 'idempotency/idempotency.service';

describe('MpesaController', () => {
  let controller: MpesaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule.forRoot({ isGlobal: true })],
      controllers: [MpesaController],
      providers: [
        { provide: MpesaService, useValue: {} },
        { provide: MpesaCallbackIdempotencyInterceptor, useValue: {} },
        { provide: IdempotencyService, useValue: {} },
      ],
    }).compile();

    controller = module.get<MpesaController>(MpesaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
