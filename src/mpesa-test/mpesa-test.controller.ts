import { Body, Controller, Get, Post } from '@nestjs/common';
import { InitiateSTKDto } from 'mpesa/dto/initiateSTK.dto';
import { MpesaService } from 'mpesa/mpesa.service';

@Controller('mpesa-test')
export class MpesaTestController {
  constructor(private readonly mpesaService: MpesaService) {}

  @Post('stk')
  async stkPush(@Body() dto: InitiateSTKDto) {
    return await this.mpesaService.initiateSTKPush(dto);
  }

  @Get('token')
  async getAccessToken() {
    const token = await this.mpesaService.getAccessToken();
    return { token };
  }
}
