import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getLocalDateKey } from '../common/utils/date.utils';
import { getRankingWeekStart } from '../dashboard/ranking-season';

// Mantém métricas semanais por um trimestre para permitir consultas futuras sem crescimento ilimitado.
const RANKING_HISTORY_TTL_SECONDS = 13 * 7 * 24 * 60 * 60;
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;
  constructor(private configService: ConfigService) {}
  onModuleInit() {
    const configuredUrl = this.configService.get<string>('REDIS_URL')?.trim();
    const redisUrl = configuredUrl
      ?.replace(/^valkeys:\/\//, 'rediss://')
      .replace(/^valkey:\/\//, 'redis://');

    if (redisUrl) {
      this.client = new Redis(redisUrl, {
        maxRetriesPerRequest: 3,
        enableReadyCheck: true,
      });
      return;
    }

    const useTls =
      this.configService.get<string>('REDIS_TLS')?.toLowerCase() === 'true';
    const host = this.configService.get<string>('REDIS_HOST');

    this.client = new Redis({
      host,
      port: this.configService.get<number>('REDIS_PORT'),
      username: this.configService.get<string>('REDIS_USERNAME'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
      tls: useTls ? { servername: host } : undefined,
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
    });
  }
  onModuleDestroy() {
    this.client.quit();
  }
  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client.set(key, value, 'EX', ttlSeconds);
  }
  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }
  async mget(keys: string[]): Promise<(string | null)[]> {
    return keys.length ? this.client.mget(...keys) : [];
  }
  async recordRankingXp(
    usuarioId: number,
    previousPoints: number,
    amount: number,
  ): Promise<void> {
    if (amount <= 0) return;
    const week = getRankingWeekStart();
    const ttl = RANKING_HISTORY_TTL_SECONDS;
    const baselineKey = `ranking:week:${week}:baseline:${usuarioId}`;
    const xpKey = `ranking:week:${week}:xp:${usuarioId}`;
    await this.eval(
      "if redis.call('SETNX', KEYS[1], ARGV[1]) == 1 then redis.call('EXPIRE', KEYS[1], ARGV[3]) end; local value = redis.call('INCRBY', KEYS[2], ARGV[2]); if value == tonumber(ARGV[2]) then redis.call('EXPIRE', KEYS[2], ARGV[3]) end; redis.call('SETNX', KEYS[3], ARGV[4]); return value",
      [baselineKey, xpKey, 'ranking:tracking-start'],
      [previousPoints, amount, ttl, getLocalDateKey()],
    );
  }
  async recordRankingChallenge(usuarioId: number): Promise<void> {
    const week = getRankingWeekStart();
    await this.incrBy(
      `ranking:week:${week}:challenges:${usuarioId}`,
      1,
      RANKING_HISTORY_TTL_SECONDS,
    );
    await this.client.set('ranking:tracking-start', getLocalDateKey(), 'NX');
  }
  async del(key: string): Promise<number> {
    return this.client.del(key);
  }
  async incrBy(
    key: string,
    amount: number,
    ttlSeconds?: number,
  ): Promise<number> {
    const value = await this.client.incrby(key, amount);
    if (ttlSeconds !== undefined && value === amount) {
      await this.client.expire(key, ttlSeconds);
    }
    return value;
  }
  async decrBy(key: string, amount: number): Promise<number> {
    return this.client.decrby(key, amount);
  }
  async eval(
    script: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }
}
