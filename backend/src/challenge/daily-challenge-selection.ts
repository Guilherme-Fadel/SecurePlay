import { getLocalDateKey, ttlUntilEndOfDay } from '../common/utils/date.utils';
import { RedisService } from '../redis/redis.service';
import { Challenge } from './challenge.entity';

interface AttemptRecord {
  challenge_id: number;
  completed: boolean;
  started_at: Date | null;
}

/**
 * Escolha estável do desafio do dia: retoma a tentativa aberta de hoje ou sorteia por hash
 * de aluno+dia entre os ativos ainda não concluídos (evita ORDER BY RAND() no banco).
 * Devolve null quando não há desafio disponível.
 */
export function pickDailyChallengeId(
  usuarioId: number,
  day: string,
  records: AttemptRecord[],
  activeIds: number[],
): number | null {
  const completed = new Set(
    records.filter((record) => record.completed).map((r) => r.challenge_id),
  );
  const availableIds = activeIds.filter((id) => !completed.has(id));
  if (availableIds.length === 0) return null;
  const seed = `${usuarioId}:${day}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const partial = records.find(
    (record) =>
      !record.completed &&
      record.started_at &&
      getLocalDateKey(new Date(record.started_at)) === day &&
      availableIds.includes(record.challenge_id),
  );
  return partial?.challenge_id ?? availableIds[hash % availableIds.length];
}

const dailyCacheKey = (usuarioId: number) => `daily-challenge:${usuarioId}`;

/** Cache do desafio do dia no Redis; sem Redis, devolve null e a leitura vem do SQL. */
export async function readDailyCache(
  redis: Pick<RedisService, 'get'>,
  usuarioId: number,
): Promise<Challenge | null> {
  try {
    const cached = await redis.get(dailyCacheKey(usuarioId));
    return cached ? (JSON.parse(cached) as Challenge) : null;
  } catch {
    return null;
  }
}

export async function writeDailyCache(
  redis: Pick<RedisService, 'set'>,
  usuarioId: number,
  challenge: Challenge,
): Promise<void> {
  await redis
    .set(
      dailyCacheKey(usuarioId),
      JSON.stringify(challenge),
      ttlUntilEndOfDay(),
    )
    .catch(() => undefined);
}
