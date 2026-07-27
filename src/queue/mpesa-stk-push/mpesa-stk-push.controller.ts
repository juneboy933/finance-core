import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { RateLimiterGuard } from 'rate-limiter/rate-limiter/rate-limiter.guard';
import { InitiateSTKDto } from 'mpesa/dto/initiateSTK.dto';

@Controller('mpesa')
export class MpesaStkPushController {
  constructor(private readonly mpesaQueue: MpesaStkPushQueueService) {}

  @Post('stk-push')
  @UseGuards(RateLimiterGuard)
  async initiateStkPush(@Body() dto: InitiateSTKDto) {
    return this.mpesaQueue.enqueue(dto);
  }
}
