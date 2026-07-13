import { Body, Controller, Get, Post } from '@nestjs/common';
import { InitiateSTKDto } from 'src/mpesa/dto/initiateSTK.dto';
import { MpesaService } from 'src/mpesa/mpesa.service';

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
