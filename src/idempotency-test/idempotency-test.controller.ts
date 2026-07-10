import {
  Body,
  Controller,
  Logger,
  Post,
  UseInterceptors,
} from '@nestjs/common';
import { IdempotencyInterceptor } from 'src/idempotency/interceptor/idempotency.interceptor';

@Controller('idempotency-test')
export class IdempotencyTestController {
  private readonly logger = new Logger(IdempotencyTestController.name);

  @Post('callback')
  @UseInterceptors(IdempotencyInterceptor)
  handleMpesaCallback(@Body() payload: { amount?: number }) {
    this.logger.log('processing payment');
    return { received: true, amount: payload.amount ?? null };
  }
}
