import { Module } from '@nestjs/common';
import { MpesaTestController } from './mpesa-test.controller';
import { MpesaModule } from 'src/mpesa/mpesa.module';

@Module({
  imports: [MpesaModule],
  controllers: [MpesaTestController],
})
export class MpesaTestModule {}
