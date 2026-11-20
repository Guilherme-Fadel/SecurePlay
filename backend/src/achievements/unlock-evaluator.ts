import { Inject, Injectable, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { DailyCheckin } from '../dashboard/daily-checkin.entity';
import { DashboardService } from '../dashboard/dashboard.service';
import { getSeasonXpByUser } from '../dashboard/ranking-season';
import { RedisService } from '../redis/redis.service';
import { Usuario } from '../usuario/usuario.entity';
import { UsuarioStats } from '../usuario-stats/usuario-stats.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import type { UnlockCondition, UnlockMetric, UnlockRule } from './unlock-rule';

export interface UnlockFacts {
  xpSeason: number;
  xpTotal: number;
  accessDays: number;
  streak: number;
  unlockedAchievements: Set<string>;
  rank: { empresa: number | null; global: number | null };
}

export interface ConditionProgress {
  metric: UnlockMetric;
  label: string;
  current: number | boolean;
  target: number | string;
  met: boolean;
  /** Só em condições de colocação: onde a posição é medida. */
  scope?: 'empresa' | 'global';
}

const LABELS: Record<UnlockMetric, string> = {
  xp_season: 'XP na temporada',
  xp_total: 'XP total',
  rank: 'Colocação na temporada',
  access_days: 'Dias de acesso',
  streak: 'Sequência de acesso',
  achievement: 'Conquista',
};

function evaluateCondition(
  condition: UnlockCondition,
  facts: UnlockFacts,
): ConditionProgress {
  const label = LABELS[condition.metric];
  switch (condition.metric) {
    case 'xp_season':
    case 'xp_total':
    case 'access_days':
    case 'streak': {
      const current = {
        xp_season: facts.xpSeason,
        xp_total: facts.xpTotal,
        access_days: facts.accessDays,
        streak: facts.streak,
      }[condition.metric];
      return {
        metric: condition.metric,
        label,
        current,
        target: condition.min,
        met: current >= condition.min,
      };
    }
    case 'rank': {
      const position = facts.rank[condition.scope];
      // Sem posição (sem empresa, teste gratuito, gestão) nunca libera.
      // `current` é 0 quando não há posição, para a UI não exibir "null".
      return {
        metric: 'rank',
        label,
        current: position ?? 0,
        target: condition.top,
        scope: condition.scope,
        met: position !== null && position <= condition.top,
      };
    }
    case 'achievement':
      return {
        metric: 'achievement',
        label,
        current: facts.unlockedAchievements.has(condition.slug),
        target: condition.slug,
        met: facts.unlockedAchievements.has(condition.slug),
      };
  }
}

export function evaluateRule(
  rule: UnlockRule | null,
  facts: UnlockFacts,
): { met: boolean; conditions: ConditionProgress[] } {
  if (!rule) return { met: true, conditions: [] };
  const conditions = rule.conditions.map((condition) =>
    evaluateCondition(condition, facts),
  );
  const met =
    rule.mode === 'all'
      ? conditions.every((condition) => condition.met)
      : conditions.some((condition) => condition.met);
  return { met, conditions };
}

type RankScope = 'empresa' | 'global';

/** Métricas que a regra consulta (para o loader buscar só o necessário). */
export function metricsOf(rule: UnlockRule | null): Set<UnlockMetric> {
  return new Set(rule?.conditions.map((condition) => condition.metric) ?? []);
}

/** Escopos de colocação que a regra usa. */
export function rankScopesOf(rule: UnlockRule | null): Set<RankScope> {
  const scopes = new Set<RankScope>();
  for (const condition of rule?.conditions ?? []) {
    if (condition.metric === 'rank') scopes.add(condition.scope);
  }
  return scopes;
}

/**
 * Carrega apenas os fatos que a regra usa. As conquistas desbloqueadas vêm das
 * linhas já persistidas de `usuario_achievement` (a trilha as mantém em dia via
 * `progress.changed`), sem depender do AchievementsService (evita ciclo de DI).
 */
@Injectable()
export class UnlockFactsLoader {
  private readonly logger = new Logger(UnlockFactsLoader.name);

  constructor(
    @Inject('DATA_SOURCE') private readonly dataSource: DataSource,
    private readonly redis: RedisService,
    private readonly dashboard: DashboardService,
  ) {}

  async load(
    usuarioId: number,
    needs: Set<UnlockMetric>,
    rankScopes?: ReadonlySet<RankScope>,
    options: { strict?: boolean } = {},
  ): Promise<UnlockFacts> {
    const facts: UnlockFacts = {
      xpSeason: 0,
      xpTotal: 0,
      accessDays: 0,
      streak: 0,
      unlockedAchievements: new Set<string>(),
      rank: { empresa: null, global: null },
    };
    const tasks: Promise<void>[] = [];
    if (needs.has('xp_total') || needs.has('streak')) {
      tasks.push(
        this.dataSource
          .getRepository(UsuarioStats)
          .findOne({ where: { usuario_id: usuarioId } })
          .then((stats) => {
            if (needs.has('xp_total')) facts.xpTotal = stats?.total_points ?? 0;
            if (needs.has('streak')) facts.streak = stats?.current_streak ?? 0;
          }),
      );
    }
    if (needs.has('xp_season')) {
      tasks.push(
        getSeasonXpByUser(this.redis, [usuarioId]).then(
          (byUser) => {
            facts.xpSeason = byUser.get(usuarioId) ?? 0;
          },
          (error: unknown) => {
            // Compra não pode liberar sem avaliar: propaga. Leitura da loja degrada.
            if (options.strict) throw error;
            const reason =
              error instanceof Error
                ? `${error.name}: ${error.message}`
                : 'erro';
            this.logger.warn(`XP da temporada indisponível (Redis): ${reason}`);
            facts.xpSeason = 0;
          },
        ),
      );
    }
    if (needs.has('access_days')) {
      tasks.push(
        this.dataSource
          .getRepository(DailyCheckin)
          .count({ where: { usuario_id: usuarioId } })
          .then((total) => {
            facts.accessDays = total;
          }),
      );
    }
    if (needs.has('achievement')) {
      tasks.push(
        this.dataSource
          .getRepository(UsuarioAchievement)
          .find({
            where: { usuario_id: usuarioId, unlocked: true },
            relations: { achievement: true },
          })
          .then((records) => {
            for (const record of records) {
              if (record.achievement?.slug) {
                facts.unlockedAchievements.add(record.achievement.slug);
              }
            }
          }),
      );
    }
    if (needs.has('rank')) {
      tasks.push(
        this.loadRank(
          usuarioId,
          rankScopes ?? new Set<RankScope>(['empresa', 'global']),
        ).then((rank) => {
          facts.rank = rank;
        }),
      );
    }
    await Promise.all(tasks);
    return facts;
  }

  private async loadRank(
    usuarioId: number,
    scopes: ReadonlySet<RankScope>,
  ): Promise<UnlockFacts['rank']> {
    const rank: UnlockFacts['rank'] = { empresa: null, global: null };
    const user = await this.dataSource
      .getRepository(Usuario)
      .findOne({ where: { id: usuarioId } });
    // Só aluno fora do teste gratuito participa de colocação para liberar item.
    if (!user || user.role !== Role.USER || user.trial_started_at) return rank;
    const [empresa, global] = await Promise.all([
      scopes.has('empresa') && user.empresa_id
        ? this.positionIn(usuarioId, 'company')
        : null,
      scopes.has('global') ? this.positionIn(usuarioId, 'global') : null,
    ]);
    rank.empresa = empresa;
    rank.global = global;
    return rank;
  }

  /** Posição no escopo pedido; null se o ranking falhar ou cair em outro escopo. */
  private async positionIn(
    usuarioId: number,
    scope: 'company' | 'global',
  ): Promise<number | null> {
    try {
      const ranking = await this.dashboard.getRanking(usuarioId, scope, false, {
        includeImages: false,
        includeEntries: false,
      });
      if (ranking.scope !== scope) return null;
      const current = ranking.currentUser;
      // Sem pontos na temporada todos empatam em 1º: ainda não há colocação.
      if (!current || !(current.points > 0)) return null;
      return current.position ?? null;
    } catch (error) {
      // Sem dados pessoais: só o escopo e o erro.
      const reason =
        error instanceof Error ? `${error.name}: ${error.message}` : 'erro';
      this.logger.warn(
        `Colocação indisponível para liberação (escopo ${scope}): ${reason}`,
      );
      return null;
    }
  }
}
