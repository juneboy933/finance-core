import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { RateLimiterGuard } from 'rate-limiter/rate-limiter/rate-limiter.guard';
import { InitiateSTKDto } from 'mpesa/dto/initiateSTK.dto';
import type { RequestWithCorrelationId } from 'middleware/correlation-id/correlation-id.middleware';

@Controller('mpesa')
export class MpesaStkPushController {
  constructor(private readonly mpesaQueue: MpesaStkPushQueueService) {}

  @Post('stk-push')
  @UseGuards(RateLimiterGuard)
  async initiateStkPush(
    @Body() dto: InitiateSTKDto,
    @Req() req: RequestWithCorrelationId,
  ) {
    return this.mpesaQueue.enqueue(dto, req.correlationId);
  }
}
