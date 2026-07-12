import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { IdempotencyTestModule } from './idempotency-test/idempotency-test.module';
import { ConfigModule } from '@nestjs/config';
import { LedgerModule } from './ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';
import { LedgerTestModule } from './ledger-test/ledger-test.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    IdempotencyModule,
    IdempotencyTestModule,
    LedgerModule,
    PrismaModule,
    LedgerTestModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
