import { InjectQueue } from '@nestjs/bullmq';
import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { StkPushJobData } from './dto/mpesa-stk-push.dto';
import { PrismaService } from 'prisma/prisma.service';
import { normalizePhone } from 'shared/phone.util';

export interface MpesaStkPushQueueJob {
  data: StkPushJobData;
  correlationId: string;
}

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
    private readonly stkPushQueue: Queue<StkPushJobData>,
    private readonly prisma: PrismaService,
  ) {}

  async enqueue(userId: string, data: StkPushJobData) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const normalizedNumber = normalizePhone(data.phoneNumber);

    if (user.phone_number !== normalizedNumber) {
      throw new ForbiddenException(
        'You can only initiate STK push to your own phone number.',
      );
    }

    return this.stkPushQueue.add(
      'initiate',
      { ...data, phoneNumber: normalizedNumber },
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
