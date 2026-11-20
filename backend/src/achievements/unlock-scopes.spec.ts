import { metricsOf, rankScopesOf } from './unlock-evaluator';
import type { UnlockRule } from './unlock-rule';

describe('metricsOf e rankScopesOf', () => {
  const rule: UnlockRule = {
    mode: 'any',
    conditions: [
      { metric: 'xp_total', min: 10 },
      { metric: 'rank', top: 5, scope: 'empresa' },
      { metric: 'rank', top: 3, scope: 'empresa' },
      { metric: 'achievement', slug: 'a' },
    ],
  };

  it('metricsOf devolve as métricas distintas da regra', () => {
    expect([...metricsOf(rule)].sort()).toEqual([
      'achievement',
      'rank',
      'xp_total',
    ]);
    expect(metricsOf(null).size).toBe(0);
  });

  it('rankScopesOf devolve só os escopos de colocação usados', () => {
    expect([...rankScopesOf(rule)]).toEqual(['empresa']);
    expect(
      [
        ...rankScopesOf({
          mode: 'all',
          conditions: [
            { metric: 'rank', top: 1, scope: 'global' },
            { metric: 'rank', top: 1, scope: 'empresa' },
          ],
        }),
      ].sort(),
    ).toEqual(['empresa', 'global']);
    expect(rankScopesOf(null).size).toBe(0);
    expect(
      rankScopesOf({ mode: 'all', conditions: [{ metric: 'streak', min: 1 }] })
        .size,
    ).toBe(0);
  });
});
