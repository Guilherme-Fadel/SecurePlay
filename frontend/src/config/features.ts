export const COMPANY_GAMES = [
  { slug: 'quiz-relampago', label: 'Quiz Relâmpago' },
  { slug: 'caca-phishing', label: 'Caça ao Phishing' },
  { slug: 'classificacao-dados', label: 'Classificação de Dados' },
  { slug: 'termotech', label: 'Termo Tech' },
] as const;

export type CompanyGameSlug = (typeof COMPANY_GAMES)[number]['slug'];
export interface CompanyParameters {
  rankingEnabled: boolean;
  globalRankingEnabled: boolean;
  achievementsEnabled: boolean;
  enabledGames: CompanyGameSlug[];
}

export const NO_COMPANY_PARAMETERS: CompanyParameters = {
  rankingEnabled: false,
  globalRankingEnabled: false,
  achievementsEnabled: false,
  enabledGames: [],
};

export function companySessionKey(user: { userId: number; role?: string; empresa_id: number | null; empresa_parametros: CompanyParameters } | null) {
  return JSON.stringify([user?.userId, user?.role, user?.empresa_id, user?.empresa_parametros]);
}

export function companyCacheKey(key: string, user: Parameters<typeof companySessionKey>[0]) {
  return `${key}::company-session=${companySessionKey(user)}`;
}

export function companyIdentityKey(user: Parameters<typeof companySessionKey>[0]) {
  return JSON.stringify([user?.userId, user?.role, user?.empresa_id]);
}

export function companyFeaturesForUser(user: { role?: string; empresa_id: number | null; empresa_parametros: CompanyParameters } | null) {
  if (user?.role === 'platform_admin') {
    return { ranking: true, globalRanking: true, achievements: true, games: COMPANY_GAMES.map((game) => game.slug) };
  }
  const parameters = user?.empresa_id ? user.empresa_parametros ?? NO_COMPANY_PARAMETERS : NO_COMPANY_PARAMETERS;
  return {
    ranking: parameters.rankingEnabled,
    globalRanking: parameters.rankingEnabled && parameters.globalRankingEnabled,
    achievements: parameters.achievementsEnabled,
    games: parameters.enabledGames,
  };
}
