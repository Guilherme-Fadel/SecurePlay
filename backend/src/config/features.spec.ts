import {
  COMPANY_GAME_SLUGS,
  isFeatureEnabled,
  noCompanyParameters,
  resolveCompanyParameters,
} from './features';

describe('company parameters', () => {
  it('defaults to the institutional pilot profile', () => {
    expect(resolveCompanyParameters(null)).toEqual({
      rankingEnabled: true,
      globalRankingEnabled: false,
      achievementsEnabled: false,
      enabledGames: [...COMPANY_GAME_SLUGS],
    });
  });

  it('denies optional resources without a company', () => {
    const parameters = noCompanyParameters();
    expect(isFeatureEnabled(parameters, 'ranking')).toBe(false);
    expect(isFeatureEnabled(parameters, 'achievements')).toBe(false);
    expect(parameters.enabledGames).toEqual([]);
  });

  it('disables the whole ranking even when global scope was previously enabled', () => {
    const parameters = resolveCompanyParameters({
      rankingEnabled: false,
      globalRankingEnabled: true,
    });
    expect(isFeatureEnabled(parameters, 'ranking')).toBe(false);
    expect(isFeatureEnabled(parameters, 'globalRanking')).toBe(false);
  });

  it('preserves empty game selection and company-specific achievements', () => {
    const parameters = resolveCompanyParameters({
      enabledGames: [],
      achievementsEnabled: true,
    });
    expect(parameters.enabledGames).toEqual([]);
    expect(isFeatureEnabled(parameters, 'achievements')).toBe(true);
  });
});
