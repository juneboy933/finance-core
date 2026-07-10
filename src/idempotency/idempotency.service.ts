import { Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';

type IdempotencyRecord =
  { status: 'processing' } | { status: 'completed'; response: unknown };

@Injectable()
export class IdempotencyService {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) {
      throw new Error('REDIS_URL is not defined');
    }
    this.redis = new Redis(redisUrl);
  }

  async claim(idempotency: string): Promise<'claimed' | IdempotencyRecord> {
    const key = `idempotencyKey:${idempotency}`;
    const record: IdempotencyRecord = { status: 'processing' };
    const result = await this.redis.set(
      key,
      JSON.stringify(record),
      'EX',
      30,
      'NX',
    );

    if (result === 'OK') {
      return 'claimed';
    }

    const existing = await this.redis.get(key);
    if (!existing) {
      return 'claimed';
    }

    return JSON.parse(existing) as IdempotencyRecord;
  }

  async complete(idempotency: string, response: unknown) {
    const key = `idempotencyKey:${idempotency}`;
    const record: IdempotencyRecord = { status: 'completed', response };
    // Only set the completed record if a processing record already exists
    const result = await this.redis.set(
      key,
      JSON.stringify(record),
      'EX',
      24 * 60 * 60,
      'XX',
    );

    if (result !== 'OK') {
      throw new NotFoundException(
        `Idempotency key ${idempotency} was not found when completing - claim() may not have been called first`,
      );
    }
    return record;
  }
}
