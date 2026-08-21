import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { StkPushJobData } from './dto/mpesa-stk-push.dto';

type MpesaStkPushQueueJob = {
  data: StkPushJobData;
  correlationId: string;
};

@Injectable()
export class MpesaStkPushQueueService {
  constructor(
    @InjectQueue('mpesa-stk-push')
    private readonly stkPushQueue: Queue<MpesaStkPushQueueJob>,
  ) {}

  async enqueue(data: StkPushJobData, correlationId: string) {
    return this.stkPushQueue.add(
      'initiate',
      {
        data,
        correlationId,
      },
      {
        attempts: 2,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      },
    );
  }
}
