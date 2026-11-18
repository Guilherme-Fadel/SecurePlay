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
 * Reserva atômica de uma tentativa: com bloqueio ativo recusa (retorna 0); senão
 * soma 1 ao contador (renovando a janela) e, se o total atingir o limiar, grava o
 * bloqueio. A escala é a mesma de `lockDurationMs`.
 * KEYS: [bloqueio, contador]. ARGV: [janela s, falhas livres, base ms, teto ms].
 */
export const RESERVE_ATTEMPT_SCRIPT = `
if redis.call('EXISTS', KEYS[1]) == 1 then return 0 end
local total = redis.call('INCR', KEYS[2])
redis.call('EXPIRE', KEYS[2], tonumber(ARGV[1]))
local free = tonumber(ARGV[2])
if total > free then
  local exponent = math.min(total - free - 1, 10)
  local ms = math.min(tonumber(ARGV[3]) * 2 ^ exponent, tonumber(ARGV[4]))
  redis.call('SET', KEYS[1], '1', 'PX', math.ceil(ms))
end
return 1
`;

/**
 * Devolve uma tentativa já reservada: decrementa o contador sem passar de 0. Não
 * mexe no bloqueio nem no prazo do contador.
 * KEYS: [contador].
 */
export const REFUND_ATTEMPT_SCRIPT = `
local total = tonumber(redis.call('GET', KEYS[1]))
if total and total > 0 then redis.call('DECR', KEYS[1]) end
return 1
`;

/** Minúsculas e sem diacríticos, como a collation do MySQL compara o e-mail. */
function foldIdentifier(identifier: string): string {
  return identifier
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase();
}

/**
 * Chave do contador. Conta existente usa o id: o banco compara e-mail sem
 * diferenciar maiúsculas ou acentos, então variações do texto não podem ganhar
 * contador próprio. Identificador sem conta usa um hash do texto normalizado do
 * mesmo jeito (sem acento e minúsculas), sem dado pessoal no Redis.
 */
export function loginSubject(identifier: string, userId?: number): string {
  if (userId !== undefined) return `u:${userId}`;
  return `i:${createHash('sha256').update(foldIdentifier(identifier)).digest('hex')}`;
}

/**
 * Bloqueio de login por conta, independente do IP (o limite por IP sozinho não
 * segura tentativas distribuídas). Com o Redis indisponível, o login segue sem
 * esta camada e o limite por IP continua valendo.
 *
 * Contrato: `reserveAttempt` ANTES de conferir senha ou código (conta a tentativa
 * e recusa com 429 se houver bloqueio); `reset` só quando uma sessão é emitida.
 * `refund` devolve a tentativa da senha certa quando o login segue para o MFA: o
 * login neutro no contador, enquanto cada código errado continua contando. Não
 * zera o contador nem o bloqueio.
 */
@Injectable()
export class LoginAttemptsService {
  private readonly logger = new Logger(LoginAttemptsService.name);

  constructor(private readonly redis: RedisService) {}

  async reserveAttempt(subject: string): Promise<void> {
    let allowed = true;
    try {
      const result = await this.redis.eval(
        RESERVE_ATTEMPT_SCRIPT,
        [lockKey(subject), failKey(subject)],
        [
          LOGIN_FAILURE_WINDOW_SECONDS,
          FREE_FAILURES,
          BASE_LOCK_MS,
          MAX_LOCK_MS,
        ],
      );
      allowed = Number(result) === 1;
    } catch {
      this.warnUnavailable();
    }
    if (!allowed)
      throw new HttpException(
        LOGIN_LOCKED_MESSAGE,
        HttpStatus.TOO_MANY_REQUESTS,
      );
  }

  async reset(subject: string): Promise<void> {
    try {
      await this.redis.del(failKey(subject));
      await this.redis.del(lockKey(subject));
    } catch {
      this.warnUnavailable();
    }
  }

  async refund(subject: string): Promise<void> {
    try {
      await this.redis.eval(REFUND_ATTEMPT_SCRIPT, [failKey(subject)], []);
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
