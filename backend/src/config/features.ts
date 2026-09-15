export const COMPANY_GAME_SLUGS = [
  'quiz-relampago',
  'caca-phishing',
  'classificacao-dados',
  'termotech',
] as const;
export type CompanyGameSlug = (typeof COMPANY_GAME_SLUGS)[number];
export type FeatureName = 'achievements' | 'ranking' | 'globalRanking';

export interface CompanyParameters {
  rankingEnabled: boolean;
  globalRankingEnabled: boolean;
  achievementsEnabled: boolean;
  enabledGames: CompanyGameSlug[];
}

export function resolveCompanyParameters(
  parameters?: Partial<CompanyParameters> | null,
): CompanyParameters {
  return {
    rankingEnabled: parameters?.rankingEnabled ?? true,
    globalRankingEnabled: parameters?.globalRankingEnabled ?? false,
    achievementsEnabled: parameters?.achievementsEnabled ?? false,
    enabledGames: parameters?.enabledGames
      ? COMPANY_GAME_SLUGS.filter((slug) =>
          parameters.enabledGames!.includes(slug),
        )
      : [...COMPANY_GAME_SLUGS],
  };
}

export function noCompanyParameters(): CompanyParameters {
  return {
    rankingEnabled: false,
    globalRankingEnabled: false,
    achievementsEnabled: false,
    enabledGames: [],
  };
}

export function platformAdminParameters(): CompanyParameters {
  return {
    rankingEnabled: true,
    globalRankingEnabled: true,
    achievementsEnabled: true,
    enabledGames: [...COMPANY_GAME_SLUGS],
  };
}

export function isFeatureEnabled(
  parameters: CompanyParameters,
  feature: FeatureName,
): boolean {
  if (feature === 'achievements') return parameters.achievementsEnabled;
  if (feature === 'ranking') return parameters.rankingEnabled;
  return parameters.rankingEnabled && parameters.globalRankingEnabled;
}
