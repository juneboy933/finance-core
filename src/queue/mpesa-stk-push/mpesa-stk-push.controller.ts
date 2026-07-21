import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { InitiateSTKDto } from 'src/mpesa/dto/initiateSTK.dto';
import { RateLimiterGuard } from 'src/rate-limiter/rate-limiter/rate-limiter.guard';

@Controller('mpesa')
export class MpesaStkPushController {
  constructor(private readonly mpesaQueue: MpesaStkPushQueueService) {}

  @Post('stk-push')
  @UseGuards(RateLimiterGuard)
  async initiateStkPush(@Body() dto: InitiateSTKDto) {
    return this.mpesaQueue.enqueue(dto);
  }
}
