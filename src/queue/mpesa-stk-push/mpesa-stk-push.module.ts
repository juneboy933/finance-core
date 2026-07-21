import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MpesaModule } from 'src/mpesa/mpesa.module';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { MpesaStkPushProcessor } from './mpesa-stk-push.processor';
import { MpesaStkPushController } from './mpesa-stk-push.controller';
import { RateLimiterModule } from 'src/rate-limiter/rate-limiter.module';

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
