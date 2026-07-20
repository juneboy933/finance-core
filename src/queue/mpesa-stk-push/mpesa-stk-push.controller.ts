import { Body, Controller, Post } from '@nestjs/common';
import { MpesaStkPushQueueService } from './mpesa-stk-push.queue';
import { InitiateSTKDto } from 'src/mpesa/dto/initiateSTK.dto';

@Controller('mpesa')
export class MpesaStkPushController {
  constructor(private readonly mpesaQueue: MpesaStkPushQueueService) {}

  @Post('stk-push')
  async initiateStkPush(@Body() dto: InitiateSTKDto) {
    return this.mpesaQueue.enqueue(dto);
  }
}
