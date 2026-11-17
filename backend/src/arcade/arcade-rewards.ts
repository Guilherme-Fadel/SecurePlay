import { ServiceUnavailableException } from '@nestjs/common';
import { EntityManager } from 'typeorm';
import { ArcadeDailyPlays } from './entities/arcade-daily-plays.entity';
import { RedisService } from '../redis/redis.service';
import { getLocalDateKey } from '../common/utils/date.utils';
import type { TokenState } from './token.service';

export interface ArcadeResult {
  score: number;
  xpBase: number;
  multiplier: number;
  xpEarned: number;
  playsToday: number;
  feedback: unknown;
  tokens: TokenState;
}

/** Partidas do mesmo jogo no dia: 1ª 100%, 2ª 50%, 3ª 25%, da 4ª em diante 0 XP (D3). */
export function arcadeMultiplier(plays: number): number {
  if (plays <= 1) return 1;
  if (plays === 2) return 0.5;
  return plays === 3 ? 0.25 : 0;
}

export function arcadeReward(score: number, xpBase: number, plays: number) {
  const base = Math.round((xpBase * score) / 100);
  const multiplier = arcadeMultiplier(plays);
  const earned = Math.round(base * multiplier);
  return {
    xpBase: base,
    multiplier,
    // O mínimo de 10 XP vale só para a 1ª partida do dia.
    xpEarned: base > 0 && plays <= 1 ? Math.max(10, earned) : earned,
  };
}

function hostDay(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

/** O contador antigo dividia o dia pelo fuso do host, mas expirava à meia-noite SP. */
export function legacyArcadeDayKeys(
  user: number,
  slug: string,
  date: Date,
): string[] {
  const day = getLocalDateKey(date);
  const start = new Date(`${day}T00:00:00-03:00`);
  return [...new Set([hostDay(start), hostDay(date)])].map(
    (key) => `arcade-plays:${user}:${slug}:${key}`,
  );
}

export async function advanceArcadeDay(
  manager: EntityManager,
  redis: RedisService,
  user: number,
  slug: string,
  date: Date,
): Promise<number> {
  const repository = manager.getRepository(ArcadeDailyPlays);
  const where = {
    usuario_id: user,
    game_slug: slug,
    day: getLocalDateKey(date),
  };
  let counter = await repository.findOneBy(where);
  if (!counter) {
    const legacy = await redis.mget(legacyArcadeDayKeys(user, slug, date));
    if (
      legacy.some(
        (value) =>
          value !== null &&
          (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))),
      )
    ) {
      throw new ServiceUnavailableException('Contador diário indisponível');
    }
    const baseline = legacy.reduce<number>(
      (sum, value) => sum + Number(value ?? 0),
      0,
    );
    if (!Number.isSafeInteger(baseline) || baseline >= 2_147_483_647) {
      throw new ServiceUnavailableException('Contador diário indisponível');
    }
    counter = repository.create({ ...where, plays: baseline });
  }
  counter.plays += 1;
  await repository.save(counter);
  return counter.plays;
}
