import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { MpesaStkPushProcessor } from './mpesa-stk-push.processor';
import { MpesaStkPushController } from './mpesa-stk-push.controller';
import { MpesaModule } from 'mpesa/mpesa.module';
import { RateLimiterModule } from 'rate-limiter/rate-limiter.module';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mpesa-stk-push',
    }),
    MpesaModule,
    RateLimiterModule,
  ],
  providers: [MpesaStkPushQueueService, MpesaStkPushProcessor],
  controllers: [MpesaStkPushController],
  exports: [MpesaStkPushQueueService],
})
export class MpesaStkPushQueueModule {}
