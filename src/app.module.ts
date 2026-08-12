import { InternalServerErrorException, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { IdempotencyModule } from './idempotency/idempotency.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { LedgerModule } from './ledger/ledger.module';
import { PrismaModule } from './prisma/prisma.module';
import { MpesaModule } from './mpesa/mpesa.module';
import { BullModule } from '@nestjs/bullmq';
import { MpesaStkPushQueueModule } from './queue/mpesa-stk-push/mpesa-stk-push.module';
import { RateLimiterModule } from './rate-limiter/rate-limiter.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { ScheduleModule } from '@nestjs/schedule';
import { AuthModule } from './auth/auth.module';

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
    ScheduleModule.forRoot(),
    IdempotencyModule,
    LedgerModule,
    PrismaModule,
    MpesaModule,
    MpesaStkPushQueueModule,
    RateLimiterModule,
    ReconciliationModule,
    AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
