import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
export const TOKEN_CAP = 5;
export const TOKEN_REGEN_MS = 30 * 60 * 1000;
export interface TokenState {
  balance: number;
  cap: number;
  nextRegenAt: number | null;
  nextRegenInSeconds: number;
}
interface StoredTokens {
  balance: number;
  lastRegenAt: number;
}
@Injectable()
export class TokenService {
  constructor(private readonly redisService: RedisService) {}
  private key(usuario_id: number): string {
    return `op-tokens:${usuario_id}`;
  }
  protected now(): number {
    return Date.now();
  }
  private applyRegen(stored: StoredTokens, nowMs: number): StoredTokens {
    if (stored.balance >= TOKEN_CAP) {
      return { balance: TOKEN_CAP, lastRegenAt: nowMs };
    }
    const elapsed = nowMs - stored.lastRegenAt;
    if (elapsed < TOKEN_REGEN_MS) return stored;
    const intervals = Math.floor(elapsed / TOKEN_REGEN_MS);
    const regenerated = Math.min(intervals, TOKEN_CAP - stored.balance);
    const newBalance = stored.balance + regenerated;
    const newLastRegenAt =
      newBalance >= TOKEN_CAP
        ? nowMs
        : stored.lastRegenAt + regenerated * TOKEN_REGEN_MS;
    return { balance: newBalance, lastRegenAt: newLastRegenAt };
  }
  private async read(usuario_id: number): Promise<StoredTokens> {
    const raw = await this.redisService.get(this.key(usuario_id));
    if (!raw) {
      return { balance: TOKEN_CAP, lastRegenAt: this.now() };
    }
    try {
      const parsed = JSON.parse(raw) as StoredTokens;
      return {
        balance: Math.max(0, Math.min(TOKEN_CAP, parsed.balance ?? TOKEN_CAP)),
        lastRegenAt: parsed.lastRegenAt ?? this.now(),
      };
    } catch {
      return { balance: TOKEN_CAP, lastRegenAt: this.now() };
    }
  }
  private async write(usuario_id: number, state: StoredTokens): Promise<void> {
    await this.redisService.set(
      this.key(usuario_id),
      JSON.stringify(state),
      7 * 24 * 3600,
    );
  }
  private toState(stored: StoredTokens, nowMs: number): TokenState {
    if (stored.balance >= TOKEN_CAP) {
      return {
        balance: TOKEN_CAP,
        cap: TOKEN_CAP,
        nextRegenAt: null,
        nextRegenInSeconds: 0,
      };
    }
    const nextRegenAt = stored.lastRegenAt + TOKEN_REGEN_MS;
    const nextRegenInSeconds = Math.max(
      0,
      Math.ceil((nextRegenAt - nowMs) / 1000),
    );
    return {
      balance: stored.balance,
      cap: TOKEN_CAP,
      nextRegenAt,
      nextRegenInSeconds,
    };
  }
  async getState(usuario_id: number): Promise<TokenState> {
    const nowMs = this.now();
    const regenerated = this.applyRegen(await this.read(usuario_id), nowMs);
    await this.write(usuario_id, regenerated);
    return this.toState(regenerated, nowMs);
  }
  async consume(usuario_id: number): Promise<{
    ok: boolean;
    state: TokenState;
  }> {
    const nowMs = this.now();
    const script = `
      local raw = redis.call('GET', KEYS[1])
      local cap = tonumber(ARGV[1])
      local regenMs = tonumber(ARGV[2])
      local now = tonumber(ARGV[3])
      local ttl = tonumber(ARGV[4])
      local balance = cap
      local last = now
      if raw then
        local ok, data = pcall(cjson.decode, raw)
        if ok and data then
          if data.balance ~= nil then balance = data.balance end
          if data.lastRegenAt ~= nil then last = data.lastRegenAt end
        end
      end
      if balance < cap then
        local elapsed = now - last
        if elapsed >= regenMs then
          local intervals = math.floor(elapsed / regenMs)
          local regen = math.min(intervals, cap - balance)
          balance = balance + regen
          if balance >= cap then last = now else last = last + regen * regenMs end
        end
      else
        balance = cap
        last = now
      end
      local ok = 0
      if balance > 0 then
        balance = balance - 1
        ok = 1
      end
      redis.call('SET', KEYS[1], cjson.encode({ balance = balance, lastRegenAt = last }), 'EX', ttl)
      return { ok, balance, last }
    `;
    const res = (await this.redisService.eval(
      script,
      [this.key(usuario_id)],
      [TOKEN_CAP, TOKEN_REGEN_MS, nowMs, 7 * 24 * 3600],
    )) as [number, number, number];
    const ok = res[0] === 1;
    const stored: StoredTokens = { balance: res[1], lastRegenAt: res[2] };
    return { ok, state: this.toState(stored, nowMs) };
  }
  async refillToCap(usuario_id: number): Promise<TokenState> {
    const nowMs = this.now();
    const state: StoredTokens = { balance: TOKEN_CAP, lastRegenAt: nowMs };
    await this.write(usuario_id, state);
    return this.toState(state, nowMs);
  }
}
