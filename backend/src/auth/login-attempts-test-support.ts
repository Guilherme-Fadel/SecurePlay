import { lockDurationMs } from './login-attempts.service';

/**
 * Redis em memória para o contador de login. `eval` emula o script de reserva
 * atômica (cada chamada roda inteira, como no Redis) usando `lockDurationMs`.
 */
export class MemoryRedis {
  readonly values = new Map<string, string>();
  readonly ttls = new Map<string, number>();
  scripts = 0;

  eval(_script: string, keys: string[], args: (string | number)[]) {
    this.scripts++;
    const [lock, fail] = keys;
    if (this.values.has(lock)) return Promise.resolve(0);
    const total = Number(this.values.get(fail) ?? 0) + 1;
    this.values.set(fail, String(total));
    this.ttls.set(fail, Number(args[0]));
    const lockMs = lockDurationMs(total);
    if (lockMs > 0) {
      this.values.set(lock, '1');
      this.ttls.set(lock, Math.ceil(lockMs / 1000));
    }
    return Promise.resolve(1);
  }
  del(key: string) {
    const existed = this.values.delete(key);
    this.ttls.delete(key);
    return Promise.resolve(existed ? 1 : 0);
  }
}
