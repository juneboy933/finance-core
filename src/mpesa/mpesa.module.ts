import { Module } from '@nestjs/common';
import { MpesaController } from './mpesa.controller';
import { MpesaService } from './mpesa.service';
import { LedgerModule } from 'ledger/ledger.module';
import { IdempotencyModule } from 'idempotency/idempotency.module';
import { MpesaCallbackIdempotencyInterceptor } from 'idempotency/interceptor/mpesaCallback.idempotency.interceptor';

@Module({
  imports: [LedgerModule, IdempotencyModule],
  controllers: [MpesaController],
  providers: [MpesaService, MpesaCallbackIdempotencyInterceptor],
  exports: [MpesaService],
})
export class MpesaModule {}
