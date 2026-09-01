import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
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
