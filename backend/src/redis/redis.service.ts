import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private client: Redis;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.get<string>('REDIS_HOST'),
      port: this.configService.get<number>('REDIS_PORT'),
      password: this.configService.get<string>('REDIS_PASSWORD'),
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

  // Incremento atomico. Cria a chave com 0 se nao existir. Aplica TTL opcional
  // apenas na criacao (nao renova TTL de chave ja existente).
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

  // Executa um script Lua atomicamente. keys e args seguem a convencao do Redis
  // (KEYS[1..], ARGV[1..]). Retorna o resultado bruto do script.
  async eval(
    script: string,
    keys: string[],
    args: (string | number)[],
  ): Promise<unknown> {
    return this.client.eval(script, keys.length, ...keys, ...args);
  }
}
