import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RateLimiterService {
  private redis: Redis;

  private readonly rateLimitScript = `
    local key = KEYS[1]
    local now = tonumber(ARGV[1])
    local window = tonumber(ARGV[2])
    local limit = tonumber(ARGV[3])
    local member = ARGV[4]
    
    redis.call('ZREMRANGEBYSCORE', key, 0, now - window)
    local count = redis.call('ZCARD', key)

    if count < limit then
    redis.call('ZADD', key, now, member)
    redis.call('EXPIRE', key, math.ceil(window / 1000))
    return 1

    else
        return 0
    end
  `;

  constructor(private readonly configService: ConfigService) {
    const redisUrl = this.configService.get<string>('REDIS_URL');
    if (!redisUrl) throw new InternalServerErrorException('Missing REDIS_URL');
    this.redis = new Redis(redisUrl);
  }

  async checkRateLimit(userId: string) {
    const key = `rate-limit:${userId}`;
    const now = Date.now();
    const windowMs = 60 * 1000;
    const limit = 3;
    const member = `${now}-${Math.random()}`;

    const result = await this.redis.eval(
      this.rateLimitScript,
      1,
      key,
      now,
      windowMs,
      limit,
      member,
    );

    return result === 1;
  }
}
