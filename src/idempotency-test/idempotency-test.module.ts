import { Module } from '@nestjs/common';
import { IdempotencyTestController } from './idempotency-test.controller';
import { IdempotencyModule } from 'src/idempotency/idempotency.module';

@Module({
  imports: [IdempotencyModule],
  controllers: [IdempotencyTestController],
})
export class IdempotencyTestModule {}
