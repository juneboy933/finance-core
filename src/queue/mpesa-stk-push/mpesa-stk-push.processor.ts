import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MpesaService } from 'src/mpesa/mpesa.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { StkPushJobData } from './dto/mpesa-stk-push.dto';

@Processor('mpesa-stk-push')
export class MpesaStkPushProcessor extends WorkerHost {
  private readonly logger = new Logger(MpesaStkPushProcessor.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<StkPushJobData>) {
    this.logger.log(
      `Processing mpesa-stk-push job: ${job.id}, ${job.attemptsMade + 1}`,
    );

    return await this.mpesaService.initiateSTKPush({
      phoneNumber: job.data.phoneNumber,
      amount: job.data.amount,
    });
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<StkPushJobData> | undefined, error: Error) {
    if (!job) {
      this.logger.error('Received a failed event with no job attatched');
      return;
    }

    const maxAttempts = job.opts.attempts ?? 1;

    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `Job ${job.id} permanently failed after ${job.attemptsMade} attempts: ${error.message}`,
      );

      await this.prisma.deadLetter.create({
        data: {
          operationType: 'mpesa-stk-push',
          data: {
            phoneNumber: job.data.phoneNumber,
            amount: job.data.amount,
            jobId: job.id,
          },
          reason: error.message,
        },
      });
    }
  }
}
