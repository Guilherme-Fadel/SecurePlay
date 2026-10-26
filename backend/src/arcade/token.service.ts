import { Injectable } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';
import { TOKEN_STATE_SCRIPT } from './token-state';
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
  private receiptKey(usuarioId: number, runId: string): string {
    return `op-token-receipt:${usuarioId}:${runId}`;
  }

  private async mutate(
    usuarioId: number,
    mode: 'read' | 'consume' | 'refill' | 'run',
    runId?: string,
    expiresAt?: Date,
  ) {
    const result = (await this.redisService.eval(
      TOKEN_STATE_SCRIPT,
      runId
        ? [this.key(usuarioId), this.receiptKey(usuarioId, runId)]
        : [this.key(usuarioId)],
      [
        TOKEN_CAP,
        TOKEN_REGEN_MS,
        this.now(),
        7 * 24 * 3600,
        mode,
        expiresAt?.getTime() ?? 0,
      ],
    )) as [number, number, number, number];
    return {
      ok: result[0] === 1,
      expired: result[0] === -1,
      state: this.toState(
        { balance: result[1], lastRegenAt: result[2] },
        result[3],
      ),
    };
  }

  async getState(usuarioId: number): Promise<TokenState> {
    return (await this.mutate(usuarioId, 'read')).state;
  }

  async consume(
    usuarioId: number,
  ): Promise<{ ok: boolean; state: TokenState }> {
    const { ok, state } = await this.mutate(usuarioId, 'consume');
    return { ok, state };
  }

  async consumeForRun(usuarioId: number, runId: string, expiresAt: Date) {
    return this.mutate(usuarioId, 'run', runId, expiresAt);
  }

  async hasRunReceipt(usuarioId: number, runId: string): Promise<boolean> {
    return !!(await this.redisService.get(this.receiptKey(usuarioId, runId)));
  }

  async refillToCap(usuarioId: number): Promise<TokenState> {
    return (await this.mutate(usuarioId, 'refill')).state;
  }
}
