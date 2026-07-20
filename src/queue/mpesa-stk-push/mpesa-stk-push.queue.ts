import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { StkPushJobData } from './dto/mpesa-stk-push.dto';

@Injectable()
export class MpesaStkPushQueueService {
  constructor(
    @InjectQueue('mpesa-stk-push')
    private readonly stkPushQueue: Queue<StkPushJobData>,
  ) {}

  async enqueue(data: StkPushJobData) {
    return this.stkPushQueue.add('initiate', data, {
      attempts: 2,
      backoff: {
        type: 'exponential',
        delay: 1000,
      },
    });
  }
}
