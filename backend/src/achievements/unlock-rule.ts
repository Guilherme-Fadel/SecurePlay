import { BadRequestException } from '@nestjs/common';

export type UnlockMetric =
  | 'xp_season'
  | 'xp_total'
  | 'rank'
  | 'access_days'
  | 'streak'
  | 'achievement';

export type UnlockCondition =
  | {
      metric: 'xp_season' | 'xp_total' | 'access_days' | 'streak';
      min: number;
    }
  | { metric: 'rank'; top: number; scope: 'empresa' | 'global' }
  | { metric: 'achievement'; slug: string };

export interface UnlockRule {
  mode: 'all' | 'any';
  conditions: UnlockCondition[];
}

const MAX_CONDITIONS = 6;
const MAX_RANK_TOP = 1000;
const MAX_SLUG_LENGTH = 80;
const SLUG_PATTERN = /^[a-z0-9-]+$/;

const MIN_CAPS = {
  xp_season: 1_000_000,
  xp_total: 1_000_000,
  access_days: 3650,
  streak: 3650,
} as const;

type MinMetric = keyof typeof MIN_CAPS;

const MIN_LABELS: Record<MinMetric, string> = {
  xp_season: 'XP da temporada',
  xp_total: 'XP total',
  access_days: 'dias de acesso',
  streak: 'sequência',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isMinMetric(metric: unknown): metric is MinMetric {
  return typeof metric === 'string' && Object.keys(MIN_CAPS).includes(metric);
}

function isIntegerInRange(
  value: unknown,
  min: number,
  max: number,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= min &&
    value <= max
  );
}

function parseMinCondition(
  input: Record<string, unknown>,
  metric: MinMetric,
  label: string,
): UnlockCondition {
  const cap = MIN_CAPS[metric];
  const min = input.min;
  if (!isIntegerInRange(min, 1, cap)) {
    throw new BadRequestException(
      `${label}: o valor mínimo de ${MIN_LABELS[metric]} deve ser um número inteiro positivo entre 1 e ${cap}.`,
    );
  }
  return { metric, min };
}

function parseRankCondition(
  input: Record<string, unknown>,
  label: string,
): UnlockCondition {
  const { top, scope } = input;
  if (scope !== 'empresa' && scope !== 'global') {
    throw new BadRequestException(
      `${label}: a colocação exige um escopo (empresa ou global).`,
    );
  }
  if (!isIntegerInRange(top, 1, MAX_RANK_TOP)) {
    throw new BadRequestException(
      `${label}: a colocação deve ser um número inteiro entre 1 e ${MAX_RANK_TOP}.`,
    );
  }
  return { metric: 'rank', top, scope };
}

function parseAchievementCondition(
  input: Record<string, unknown>,
  label: string,
): UnlockCondition {
  const { slug } = input;
  if (
    typeof slug !== 'string' ||
    slug.length < 1 ||
    slug.length > MAX_SLUG_LENGTH ||
    !SLUG_PATTERN.test(slug)
  ) {
    throw new BadRequestException(
      `${label}: a conquista deve ter um identificador com até ${MAX_SLUG_LENGTH} caracteres (letras minúsculas, números e hífen).`,
    );
  }
  return { metric: 'achievement', slug };
}

function parseCondition(input: unknown, position: number): UnlockCondition {
  const label = `Condição ${position}`;
  if (!isRecord(input)) {
    throw new BadRequestException(`${label}: formato inválido.`);
  }
  const { metric } = input;
  if (isMinMetric(metric)) return parseMinCondition(input, metric, label);
  if (metric === 'rank') return parseRankCondition(input, label);
  if (metric === 'achievement') return parseAchievementCondition(input, label);
  throw new BadRequestException(`${label}: métrica desconhecida.`);
}

/**
 * Valida e normaliza a regra de liberação vinda do cliente.
 * Campos extras são descartados. Lança BadRequestException em português.
 */
export function parseUnlockRule(input: unknown): UnlockRule {
  if (!isRecord(input)) {
    throw new BadRequestException('Regra de liberação inválida.');
  }
  const { mode, conditions } = input;
  if (mode !== 'all' && mode !== 'any') {
    throw new BadRequestException(
      'Modo da regra de liberação inválido: use "all" ou "any".',
    );
  }
  if (!Array.isArray(conditions) || conditions.length === 0) {
    throw new BadRequestException(
      'A regra de liberação precisa de ao menos uma condição.',
    );
  }
  if (conditions.length > MAX_CONDITIONS) {
    throw new BadRequestException(
      `A regra de liberação aceita no máximo ${MAX_CONDITIONS} condições.`,
    );
  }
  return {
    mode,
    conditions: Array.from(conditions, (item: unknown, index) =>
      parseCondition(item, index + 1),
    ),
  };
}

/** Converte o campo legado de conquista exigida em condição de liberação. */
export function legacyAchievementCondition(
  slug: string | null,
): UnlockCondition | null {
  return slug ? { metric: 'achievement', slug } : null;
}
