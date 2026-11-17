import { EntityManager } from 'typeorm';
import { DailyCheckin } from '../../dashboard/daily-checkin.entity';
import { UsuarioStats } from '../../usuario-stats/usuario-stats.entity';
import { getLocalDateKey } from '../utils/date.utils';
import type { CompletionDraft } from './activity-completion.service';

export interface CheckinResult {
  day: string;
  streak: number;
  bonusXp: number;
  legacy: boolean;
}

/** Bônus do check-in: 5 XP por dia de sequência, com teto em 7 dias (35 XP/dia, D6). */
export const CHECKIN_STREAK_CAP = 7;
export function checkinBonusXp(streak: number): number {
  return Math.min(Math.max(streak, 0), CHECKIN_STREAK_CAP) * 5;
}

/** Requer o lock do usuário e a transação de XP do chamador. */
export async function createDailyCheckinDraft(
  manager: EntityManager,
  usuarioId: number,
  createdAt: Date,
): Promise<CompletionDraft<CheckinResult>> {
  const day = getLocalDateKey(createdAt);
  const statsRepo = manager.getRepository(UsuarioStats);
  let stats = await statsRepo.findOneBy({ usuario_id: usuarioId });
  stats ??= statsRepo.create({ usuario_id: usuarioId, total_points: 0 });
  // Não concede de novo o bônus legado nem regride uma data já registrada.
  const legacy = !!stats.last_checkin_date && stats.last_checkin_date >= day;
  if (!legacy) {
    const gap = stats.last_checkin_date
      ? (Date.parse(`${day}T00:00:00Z`) -
          Date.parse(`${stats.last_checkin_date}T00:00:00Z`)) /
        86_400_000
      : null;
    stats.current_streak = gap === 1 ? stats.current_streak + 1 : 1;
    stats.last_checkin_date = day;
    await statsRepo.save(stats);
  }
  const bonusXp = legacy ? 0 : checkinBonusXp(stats.current_streak);
  await manager.getRepository(DailyCheckin).insert({
    usuario_id: usuarioId,
    day,
    streak: stats.current_streak,
    bonus_xp: bonusXp,
    refill_status: legacy ? 'skipped' : 'pending',
    refill_started_at: null,
  });
  return {
    xp: bonusXp,
    result: { day, streak: stats.current_streak, bonusXp, legacy },
  };
}
