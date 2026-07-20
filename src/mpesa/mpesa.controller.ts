import { Body, Controller, Post, UseInterceptors } from '@nestjs/common';
import { MpesaService } from './mpesa.service';
import type { StkCallbackBody } from './mpesa.service';
import { MpesaCallbackIdempotencyInterceptor } from 'src/idempotency/interceptor/mpesaCallback.idempotency.interceptor';

@Controller('mpesa')
export class MpesaController {
  constructor(private readonly mpesaService: MpesaService) {}

  @Post('callback')
  @UseInterceptors(MpesaCallbackIdempotencyInterceptor)
  async handleCallback(@Body() body: StkCallbackBody) {
    await this.mpesaService.processCallback(body);
    return { ResultCode: 0, ResultDesc: 'Callback processed successfully' };
  }
}
