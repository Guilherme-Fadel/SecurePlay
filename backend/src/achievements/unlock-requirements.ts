import { BadRequestException } from '@nestjs/common';
import {
  ConditionProgress,
  evaluateRule,
  metricsOf,
  rankScopesOf,
  UnlockFacts,
  UnlockFactsLoader,
} from './unlock-evaluator';
import {
  legacyAchievementCondition,
  UnlockMetric,
  UnlockRule,
} from './unlock-rule';

/** Item ou kit: a regra nova mais a conquista exigida do modelo antigo. */
export interface UnlockTarget {
  unlock_rule: UnlockRule | null;
  required_achievement_slug?: string | null;
}

/** `required` marca a conquista legada: vale como "e também", mesmo com modo any. */
export type UnlockConditionView = ConditionProgress & { required?: true };

export interface UnlockView {
  met: boolean;
  mode: 'all' | 'any';
  conditions: UnlockConditionView[];
}

export const noRequirement = (): UnlockView => ({
  met: true,
  mode: 'all',
  conditions: [],
});

function legacyRuleOf(slug: string | null | undefined): UnlockRule | null {
  const condition = legacyAchievementCondition(slug ?? null);
  return condition ? { mode: 'all', conditions: [condition] } : null;
}

/**
 * A conquista legada sempre vale como "E": mesmo com a regra em modo `any`
 * já cumprida, a conquista exigida precisa estar desbloqueada.
 */
export function evaluateRequirement(
  target: UnlockTarget,
  facts: UnlockFacts,
): UnlockView {
  const main = evaluateRule(target.unlock_rule, facts);
  const legacy = evaluateRule(
    legacyRuleOf(target.required_achievement_slug),
    facts,
  );
  return {
    met: main.met && legacy.met,
    mode: target.unlock_rule?.mode ?? 'all',
    conditions: [
      ...main.conditions,
      ...legacy.conditions.map((condition) => ({
        ...condition,
        required: true as const,
      })),
    ],
  };
}

/**
 * Avalia vários alvos carregando os fatos do aluno uma única vez, para a união
 * das métricas que as regras usam. Sem nenhuma regra, nem consulta.
 */
export async function resolveUnlocks(
  loader: UnlockFactsLoader | undefined,
  usuarioId: number,
  targets: UnlockTarget[],
  options: { strict?: boolean } = {},
): Promise<Map<UnlockTarget, UnlockView>> {
  const needs = new Set<UnlockMetric>();
  const scopes = new Set<'empresa' | 'global'>();
  for (const target of targets) {
    for (const rule of [
      target.unlock_rule,
      legacyRuleOf(target.required_achievement_slug),
    ]) {
      for (const metric of metricsOf(rule)) needs.add(metric);
      for (const scope of rankScopesOf(rule)) scopes.add(scope);
    }
  }
  const result = new Map<UnlockTarget, UnlockView>();
  if (needs.size === 0) {
    for (const target of targets) result.set(target, noRequirement());
    return result;
  }
  if (!loader) throw new Error('Carregador de fatos de liberação ausente');
  const facts = await loader.load(usuarioId, needs, scopes, options);
  for (const target of targets) {
    result.set(target, evaluateRequirement(target, facts));
  }
  return result;
}

function remaining(condition: ConditionProgress): number {
  const current = typeof condition.current === 'number' ? condition.current : 0;
  const target = typeof condition.target === 'number' ? condition.target : 0;
  return Math.max(1, target - current);
}

function plural(count: number, one: string, many: string): string {
  return count === 1 ? `Falta 1 ${one}` : `Faltam ${count} ${many}`;
}

/** Texto em português do que ainda falta para uma condição de liberação. */
export function missingMessage(condition: ConditionProgress): string {
  const count = remaining(condition);
  switch (condition.metric) {
    case 'xp_season':
      return `${plural(count, 'XP', 'XP')} na temporada`;
    case 'xp_total':
      return `${plural(count, 'XP', 'XP')} no total`;
    case 'access_days':
      return plural(count, 'dia de acesso', 'dias de acesso');
    case 'streak':
      return plural(
        count,
        'dia de sequência de acesso',
        'dias de sequência de acesso',
      );
    case 'rank':
      return Number(condition.target) === 1
        ? 'É preciso estar em 1º lugar na temporada'
        : `É preciso estar entre os ${condition.target} primeiros da temporada`;
    case 'achievement':
      return 'A conquista necessária ainda está bloqueada';
  }
}

/** Recusa a compra com a primeira condição que ainda falta. */
export function assertUnlockMet(view: UnlockView): void {
  if (view.met) return;
  const missing = view.conditions.find((condition) => !condition.met);
  throw new BadRequestException(
    missing
      ? missingMessage(missing)
      : 'Este item ainda não está liberado para você',
  );
}

/** Confere a liberação de um único item/kit antes de abrir a transação de compra. */
export async function assertUnlocked(
  loader: UnlockFactsLoader | undefined,
  usuarioId: number,
  target: UnlockTarget,
): Promise<void> {
  const views = await resolveUnlocks(loader, usuarioId, [target], {
    strict: true,
  });
  assertUnlockMet(views.get(target) ?? noRequirement());
}
