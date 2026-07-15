import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { LedgerModule } from 'src/ledger/ledger.module';
import { IdempotencyModule } from 'src/idempotency/idempotency.module';
import { MpesaCallbackIdempotencyInterceptor } from 'src/idempotency/interceptor/mpesaCallback.idempotency.interceptor';

@Module({
  imports: [LedgerModule, IdempotencyModule],
  controllers: [MpesaController],
  providers: [MpesaService, MpesaCallbackIdempotencyInterceptor],
  exports: [MpesaService],
})
export class MpesaModule {}
