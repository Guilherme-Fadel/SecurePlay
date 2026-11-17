import { HttpException, HttpStatus, Injectable, Logger } from '@nestjs/common';
import { createHash } from 'node:crypto';
import { RedisService } from '../redis/redis.service';

/** Falhas livres antes do primeiro bloqueio; a 5ª falha bloqueia. */
const FREE_FAILURES = 4;
const BASE_LOCK_MS = 30_000;
const MAX_LOCK_MS = 15 * 60_000;
/** Janela deslizante do contador: maior que o bloqueio máximo, para a escala não recomeçar. */
export const LOGIN_FAILURE_WINDOW_SECONDS = 60 * 60;

export const LOGIN_LOCKED_MESSAGE =
  'Muitas tentativas. Tente novamente em alguns minutos.';

/** Duração do bloqueio após `failures` falhas: 30 s na 5ª, dobrando até 15 min. */
export function lockDurationMs(failures: number): number {
  if (failures <= FREE_FAILURES) return 0;
  const exponent = Math.min(failures - FREE_FAILURES - 1, 10);
  return Math.min(BASE_LOCK_MS * 2 ** exponent, MAX_LOCK_MS);
}

/**
 * Chave do contador. Conta existente usa o id: o banco compara e-mail sem
 * diferenciar maiúsculas ou acentos, então variações do texto não podem ganhar
 * contador próprio. Identificador sem conta usa um hash, sem dado pessoal no Redis.
 */
export function loginSubject(identifier: string, userId?: number): string {
  if (userId !== undefined) return `u:${userId}`;
  const normalized = identifier.trim().toLowerCase();
  return `i:${createHash('sha256').update(normalized).digest('hex')}`;
}

/**
 * Bloqueio de login por conta, independente do IP (o limite por IP sozinho não
 * segura tentativas distribuídas). Com o Redis indisponível, o login segue sem
 * esta camada e o limite por IP continua valendo.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);

  constructor(private readonly redis: RedisService) {}

  async assertNotLocked(subject: string): Promise<void> {
    let locked = false;
    try {
      locked = (await this.redis.get(lockKey(subject))) !== null;
    } catch {
      this.warnUnavailable();
    }
    if (locked)
      throw new HttpException(
        LOGIN_LOCKED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  async registerFailure(subject: string): Promise<void> {
    try {
      const key = failKey(subject);
      const failures = await this.redis.incrBy(
        key,
        1,
        LOGIN_FAILURE_WINDOW_SECONDS,
      );
      await this.redis.expire(key, LOGIN_FAILURE_WINDOW_SECONDS);
      const lockMs = lockDurationMs(failures);
      if (lockMs > 0)
        await this.redis.set(lockKey(subject), '1', Math.ceil(lockMs / 1000));
    } catch {
      this.warnUnavailable();
    }
  }

  async reset(subject: string): Promise<void> {
    try {
      await this.redis.del(failKey(subject));
      await this.redis.del(lockKey(subject));
    } catch {
      this.warnUnavailable();
    }
  }

  private warnUnavailable() {
    this.logger.warn(
      'Contador de login indisponível; seguindo só com o limite por IP',
    );
  }
}

function failKey(subject: string) {
  return `login-fail:${subject}`;
}

function lockKey(subject: string) {
  return `login-lock:${subject}`;
}
