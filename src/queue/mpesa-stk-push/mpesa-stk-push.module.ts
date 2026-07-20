import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MpesaModule } from 'src/mpesa/mpesa.module';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { MpesaStkPushProcessor } from './mpesa-stk-push.processor';
import { MpesaStkPushController } from './mpesa-stk-push.controller';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'mpesa-stk-push',
    }),
    MpesaModule,
  ],
  providers: [MpesaStkPushQueueService, MpesaStkPushProcessor],
  controllers: [MpesaStkPushController],
  exports: [MpesaStkPushQueueService],
})
export class MpesaStkPushQueueModule {}
