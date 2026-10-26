import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { getLocalDateKey, ttlUntilEndOfDay } from '../common/utils/date.utils';
import { getRankingWeekStart } from '../dashboard/ranking-season';
import type { ActivityCompletion } from '../common/gamification/activity-completion.entity';

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
  async acquireLease(
    key: string,
    owner: string,
    ttlMs: number,
  ): Promise<boolean> {
    return (await this.client.set(key, owner, 'PX', ttlMs, 'NX')) === 'OK';
  }
  async releaseLease(key: string, owner: string): Promise<void> {
    await this.eval(
      "if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end; return 0",
      [key],
      [owner],
    );
  }
  /** Valor e TTL da mesma fotografia Redis para importar partidas legadas. */
  async getWithTtl(
    key: string,
  ): Promise<{ value: string; ttlMs: number } | null> {
    const snapshot = (await this.eval(
      "local value = redis.call('GET', KEYS[1]); if not value then return {} end; return {value, redis.call('PTTL', KEYS[1])}",
      [key],
      [],
    )) as [string, number] | [];
    return snapshot.length === 2
      ? { value: snapshot[0], ttlMs: snapshot[1] }
      : null;
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
  /** Outbox de conclusão: dedupe e métricas na mesma operação Redis. */
  async applyActivityCompletion(record: ActivityCompletion): Promise<void> {
    const createdAt = new Date(record.created_at);
    const remaining = Math.ceil(
      (createdAt.getTime() + RANKING_HISTORY_TTL_SECONDS * 1000 - Date.now()) /
        1000,
    );
    if (remaining <= 0) return; // Nunca recria métricas de um período já expirado.
    const week = getRankingWeekStart(createdAt);
    const day = getLocalDateKey(createdAt);
    await this.eval(
      `
      if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
      -- Valida tipos antes de qualquer escrita: Lua não faz rollback em erro.
      for i = 2, 6 do
        local kind = redis.call('TYPE', KEYS[i]).ok
        if kind ~= 'none' and kind ~= 'string' then return redis.error_reply('Invalid activity metric type') end
      end
      for i = 2, 5 do
        local value = redis.call('GET', KEYS[i])
        if value and not string.match(value, '^%-?%d+$') then return redis.error_reply('Invalid activity metric value') end
      end
      local xp = tonumber(ARGV[2])
      if xp > 0 then
        local baseline = redis.call('GET', KEYS[2])
        if not baseline or tonumber(baseline) > tonumber(ARGV[1]) then
          redis.call('SET', KEYS[2], ARGV[1], 'EX', ARGV[4])
        end
        redis.call('INCRBY', KEYS[3], xp)
        redis.call('EXPIRE', KEYS[3], ARGV[4])
        if ARGV[7] == '1' then
          redis.call('INCRBY', KEYS[5], xp)
          redis.call('EXPIRE', KEYS[5], ARGV[5])
        end
      end
      if ARGV[3] == '1' then
        redis.call('INCRBY', KEYS[4], 1)
        redis.call('EXPIRE', KEYS[4], ARGV[4])
      end
      redis.call('SETNX', KEYS[6], ARGV[6])
      redis.call('SET', KEYS[1], '1', 'EX', ARGV[4])
      return 1
    `,
      [
        `activity-effect:${record.id}`,
        `ranking:week:${week}:baseline:${record.usuario_id}`,
        `ranking:week:${week}:xp:${record.usuario_id}`,
        `ranking:week:${week}:challenges:${record.usuario_id}`,
        `xp-today:${record.usuario_id}`,
        'ranking:tracking-start',
      ],
      [
        record.previous_points,
        record.xp,
        record.activity_type === 'challenge' ? 1 : 0,
        remaining,
        ttlUntilEndOfDay(),
        day,
        day === getLocalDateKey() ? 1 : 0,
      ],
    );
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
