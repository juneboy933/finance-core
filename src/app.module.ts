import { InternalServerErrorException, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { IdempotencyTestModule } from './idempotency-test/idempotency-test.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LedgerModule } from './ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';
import { LedgerTestModule } from './ledger-test/ledger-test.module';
import { MpesaModule } from './mpesa/mpesa.module';
import { MpesaTestModule } from './mpesa-test/mpesa-test.module';
import { BullModule } from '@nestjs/bullmq';
import { MpesaStkPushQueueModule } from './queue/mpesa-stk-push/mpesa-stk-push.module';
import { RateLimiterModule } from './rate-limiter/rate-limiter.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const redisUrl = configService.get<string>('REDIS_URL');
        if (!redisUrl) {
          throw new InternalServerErrorException('Missing REDIS_URL');
        }

        const parsed = new URL(redisUrl);

        return {
          connection: {
            host: parsed.hostname,
            port: Number(parsed.port),
            password: parsed.password || undefined,
            maxRetriesPerRequest: null,
          },
        };
      },
      inject: [ConfigService],
    }),
    IdempotencyModule,
    IdempotencyTestModule,
    LedgerModule,
    PrismaModule,
    LedgerTestModule,
    MpesaModule,
    MpesaTestModule,
    MpesaStkPushQueueModule,
    RateLimiterModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
