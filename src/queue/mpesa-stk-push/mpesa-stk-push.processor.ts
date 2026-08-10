import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { StkPushJobData } from './dto/mpesa-stk-push.dto';
import {
  MpesaService,
  DarajaNetworkException,
  DarajaRejectionException,
} from 'mpesa/mpesa.service';
import { PrismaService } from 'prisma/prisma.service';

@Processor('mpesa-stk-push', {
  concurrency: 2,
  limiter: {
    max: 2,
    duration: 1000,
  },
})
export class MpesaStkPushProcessor extends WorkerHost {
  private readonly logger = new Logger(MpesaStkPushProcessor.name);

  constructor(
    private readonly mpesaService: MpesaService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async process(job: Job<StkPushJobData>) {
    const jobId = job.id?.toString();
    if (!jobId) {
      throw new Error('Job has no ID — cannot track idempotently');
    }

    this.logger.log(
      `Processing mpesa-stk-push job: ${jobId}, attempt ${job.attemptsMade + 1}`,
    );

    const existingAttempt = await this.prisma.stkPushAttempt.findUnique({
      where: { jobId },
      select: { status: true, response: true },
    });

    if (existingAttempt?.status === 'SUCCESS') {
      return {
        message: `Job ${jobId} already succeeded. Returning stored result.`,
        data: existingAttempt.response,
      };
    }

    // Allow re-execution if status is ATTEMPTED
    if (existingAttempt?.status === 'ATTEMPTED') {
      throw new Error(
        `Job ${jobId}'s previous attempt has an unknown outcome. Refusing to execute without verification.`,
      );
    }

    // Either no record exists yet, or the previous attempt was confirmed FAILED —
    // both cases are safe to (re)claim and proceed.
    await this.prisma.stkPushAttempt.upsert({
      where: { jobId },
      create: {
        jobId,
        phoneNumber: job.data.phoneNumber,
        amount: job.data.amount,
        status: 'ATTEMPTED',
      },
      update: {
        status: 'ATTEMPTED',
      },
    });

    try {
      const response = await this.mpesaService.initiateSTKPush({
        phoneNumber: job.data.phoneNumber,
        amount: job.data.amount,
      });
      const checkoutRequestId = response.CheckoutRequestID;

      if (!checkoutRequestId) {
        throw new Error('Missing CheckoutRequestID in Mpesa response');
      }

      const updatedAttempt = await this.prisma.stkPushAttempt.update({
        where: { jobId },
        data: {
          status: 'SUCCESS',
          response: {
            MerchantRequestID: response.MerchantRequestID,
            CheckoutRequestID: response.CheckoutRequestID,
            ResponseCode: response.ResponseCode,
            ResponseDescription: response.ResponseDescription,
            CustomerMessage: response.CustomerMessage,
          },
          checkoutRequestId: checkoutRequestId,
        },
      });

      return {
        message: `Job ${jobId} processed successfully.`,
        data: updatedAttempt.response,
      };
    } catch (error) {
      const isThrottled =
        error instanceof DarajaRejectionException &&
        error.message.includes('500.003.02');

      const isRetryable =
        error instanceof DarajaNetworkException || isThrottled;

      // If non-retryable, mark failed immediately in DB
      if (!isRetryable) {
        await this.prisma.stkPushAttempt.update({
          where: { jobId },
          data: {
            status: 'FAILED',
            response: {
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
            },
          },
        });

        this.logger.error(
          `Job ${jobId} failed with a non-retryable error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      } else {
        this.logger.warn(
          `Job ${jobId} failed with a retryable error (attempt ${job.attemptsMade + 1}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }

      throw error;
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job<StkPushJobData> | undefined, error: Error) {
    if (!job) {
      this.logger.error('Received a failed event with no job attached');
      return;
    }

    const jobId = job.id?.toString();
    const maxAttempts = job.opts.attempts ?? 1;

    // Execute final state updates when retries are completely exhausted
    if (job.attemptsMade >= maxAttempts) {
      this.logger.error(
        `Job ${jobId} permanently failed after ${job.attemptsMade} attempts: ${error.message}`,
      );

      if (jobId) {
        await this.prisma.stkPushAttempt.update({
          where: { jobId },
          data: {
            status: 'FAILED',
            response: {
              errorMessage: `Exhausted ${job.attemptsMade} attempts: ${error.message}`,
              errorStack: error.stack,
            },
          },
        });
      }

      await this.prisma.deadLetter.create({
        data: {
          operationType: 'mpesa-stk-push',
          data: {
            phoneNumber: job.data.phoneNumber,
            amount: job.data.amount,
            jobId: jobId,
          },
          reason: error.message,
        },
      });
    }
  }
}
