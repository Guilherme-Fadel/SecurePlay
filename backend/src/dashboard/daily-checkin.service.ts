import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Between, DataSource } from 'typeorm';
import { TokenService } from '../arcade/token.service';
import { ActivityCompletion } from '../common/gamification/activity-completion.entity';
import { ActivityCompletionService } from '../common/gamification/activity-completion.service';
import {
  createDailyCheckinDraft,
  type CheckinResult,
} from '../common/gamification/daily-checkin';
import {
  getLocalDateKey,
  getMondayOfWeek,
  getTodayWeekIndex,
} from '../common/utils/date.utils';
import { RedisService } from '../redis/redis.service';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { DailyCheckin } from './daily-checkin.entity';

export type { CheckinResult } from '../common/gamification/daily-checkin';

class CheckinDayExpired extends Error {}

@Injectable()
export class DailyCheckinService {
  private readonly logger = new Logger(DailyCheckinService.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly source: DataSource,
    private readonly completions: ActivityCompletionService,
    private readonly tokens: TokenService,
    private readonly redis: RedisService,
  ) {}

  async register(usuarioId: number): Promise<CheckinResult> {
    return this.registerInDay(usuarioId);
  }

  async registerForDay(usuarioId: number, day: string): Promise<void> {
    try {
      await this.registerInDay(usuarioId, day);
    } catch (error) {
      if (!(error instanceof CheckinDayExpired)) throw error;
    }
  }

  private async registerInDay(
    usuarioId: number,
    expectedDay?: string,
  ): Promise<CheckinResult> {
    return this.completions.complete(
      usuarioId,
      'checkin',
      (createdAt) => {
        const day = getLocalDateKey(createdAt);
        // createdAt é obtido após o lock: a espera não pode premiar o dia seguinte.
        if (expectedDay && expectedDay !== day) throw new CheckinDayExpired();
        return Number(day.replaceAll('-', ''));
      },
      (manager, { createdAt }) =>
        createDailyCheckinDraft(manager, usuarioId, createdAt),
    );
  }

  @OnEvent('checkin.effects', { suppressErrors: false })
  async applyEffects(record: ActivityCompletion): Promise<void> {
    if (record.activity_type !== 'checkin') return;
    const day = String(record.activity_id);
    const date = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
    const claim = await this.completions.updateProgress(
      record.usuario_id,
      async (manager) => {
        const repository = manager.getRepository(DailyCheckin);
        const row = await repository.findOneByOrFail({
          usuario_id: record.usuario_id,
          day: date,
        });
        if (row.refill_status === 'done' || row.refill_status === 'skipped')
          return null;
        if (row.refill_status === 'pending' && date !== getLocalDateKey()) {
          await repository.update(
            { usuario_id: record.usuario_id, day: date },
            { refill_status: 'skipped' },
          );
          return null; // Nunca repõe no dia seguinte por um direito antigo.
        }
        const initial = row.refill_status === 'pending';
        if (initial)
          await repository.update(
            { usuario_id: record.usuario_id, day: date },
            { refill_status: 'started', refill_started_at: new Date() },
          );
        return { initial };
      },
    );
    if (!claim) return;
    const result = await this.tokens.refillForCheckin(
      record.usuario_id,
      date,
      claim.initial,
    );
    if (result.uncertain) {
      this.logger.warn(
        `Reposição de check-in incerta: atividade ${record.id}; conciliar sem repetir fichas`,
      );
      // Fila operacional SQL separada: não bloqueia métricas/conquistas.
      return;
    }
    await this.source
      .getRepository(DailyCheckin)
      .update(
        { usuario_id: record.usuario_id, day: date },
        { refill_status: result.expired ? 'skipped' : 'done' },
      );
  }

  async weekly(usuarioId: number) {
    const now = new Date();
    const today = getLocalDateKey(now);
    const monday = getMondayOfWeek(now);
    const todayIndex = getTodayWeekIndex(now);
    const [rows, stats] = await Promise.all([
      this.source.getRepository(DailyCheckin).find({
        where: { usuario_id: usuarioId, day: Between(monday, today) },
      }),
      this.source
        .getRepository(UsuarioStats)
        .findOneBy({ usuario_id: usuarioId }),
    ]);
    const checkedDays = Array<boolean>(7).fill(false);
    // Bits anteriores ao upgrade não podem ser reconstruídos por inferência.
    try {
      const legacy = await this.redis.get(`streak:${usuarioId}:${monday}`);
      const value: unknown = legacy ? JSON.parse(legacy) : null;
      if (Array.isArray(value) && value.length === 7)
        for (let index = 0; index <= todayIndex; index++)
          checkedDays[index] = value[index] === true;
    } catch {
      this.logger.warn(
        'Cache semanal indisponível; exibindo check-ins SQL conhecidos',
      );
    }
    const dates = rows.map((row) => row.day);
    if (stats?.last_checkin_date) dates.push(stats.last_checkin_date);
    for (const date of dates) {
      const index =
        (Date.parse(`${date}T00:00:00Z`) - Date.parse(`${monday}T00:00:00Z`)) /
        86_400_000;
      if (Number.isInteger(index) && index >= 0 && index <= todayIndex)
        checkedDays[index] = true;
    }
    return {
      checkedDays,
      todayIndex,
      streak: stats?.current_streak ?? 0,
      checkedToday: checkedDays[todayIndex],
    };
  }
}
