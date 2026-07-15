import { Module } from '@nestjs/common';
import { IdempotencyService } from './idempotency.service';
import { IdempotencyInterceptor } from './interceptor/idempotency.interceptor';
import { MpesaCallbackIdempotencyInterceptor } from './interceptor/mpesaCallback.idempotency.interceptor';

@Module({
  providers: [
    IdempotencyService,
    IdempotencyInterceptor,
    MpesaCallbackIdempotencyInterceptor,
  ],
  exports: [
    IdempotencyService,
    IdempotencyInterceptor,
    MpesaCallbackIdempotencyInterceptor,
  ],
})
export class IdempotencyModule {}
