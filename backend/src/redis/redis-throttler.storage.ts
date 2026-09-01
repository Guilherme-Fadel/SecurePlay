import { Injectable } from '@nestjs/common';
import { ThrottlerStorage } from '@nestjs/throttler';
import { RedisService } from './redis.service';

@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage {
  constructor(private readonly redisService: RedisService) {}

  async increment(
    key: string,
    ttl: number,
    limit: number,
    blockDuration: number,
    throttlerName: string,
  ): Promise<{
    totalHits: number;
    timeToExpire: number;
    isBlocked: boolean;
    timeToBlockExpire: number;
  }> {
    const prefix = `throttle:${throttlerName}:${key}`;
    const result = (await this.redisService.eval(
      `
        local hitsKey = KEYS[1]
        local blockKey = KEYS[2]
        local ttl = tonumber(ARGV[1])
        local limit = tonumber(ARGV[2])
        local blockDuration = tonumber(ARGV[3])
        local effectiveBlockDuration = blockDuration > 0 and blockDuration or ttl

        if redis.call('EXISTS', blockKey) == 1 then
          return { tonumber(redis.call('GET', hitsKey) or '0'), redis.call('PTTL', hitsKey), 1, redis.call('PTTL', blockKey) }
        end

        local hits = redis.call('INCR', hitsKey)
        if hits == 1 then redis.call('PEXPIRE', hitsKey, ttl) end
        local timeToExpire = redis.call('PTTL', hitsKey)

        if hits > limit then
          redis.call('SET', blockKey, '1', 'PX', effectiveBlockDuration)
          return { hits, timeToExpire, 1, effectiveBlockDuration }
        end

        return { hits, timeToExpire, 0, 0 }
      `,
      [prefix, `${prefix}:blocked`],
      [ttl, limit, blockDuration],
    )) as number[];

    return {
      totalHits: Number(result[0]),
      timeToExpire: Math.max(0, Math.ceil(Number(result[1]) / 1000)),
      isBlocked: Number(result[2]) === 1,
      timeToBlockExpire: Math.max(0, Math.ceil(Number(result[3]) / 1000)),
    };
  }
}
