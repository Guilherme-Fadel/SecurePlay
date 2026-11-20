import { BadRequestException } from '@nestjs/common';
import type { ConditionProgress, UnlockFacts } from './unlock-evaluator';
import {
  assertUnlocked,
  assertUnlockMet,
  evaluateRequirement,
  missingMessage,
  resolveUnlocks,
} from './unlock-requirements';
import type { UnlockRule } from './unlock-rule';

const facts = (overrides: Partial<UnlockFacts> = {}): UnlockFacts => ({
  xpSeason: 0,
  xpTotal: 0,
  accessDays: 0,
  streak: 0,
  unlockedAchievements: new Set<string>(),
  rank: { empresa: null, global: null },
  ...overrides,
});

const progress = (
  overrides: Partial<ConditionProgress> & Pick<ConditionProgress, 'metric'>,
): ConditionProgress => ({
  label: 'x',
  current: 0,
  target: 1,
  met: false,
  ...overrides,
});

describe('missingMessage', () => {
  it.each<[string, ConditionProgress]>([
    [
      'Faltam 40 XP na temporada',
      progress({ metric: 'xp_season', current: 60, target: 100 }),
    ],
    [
      'Faltam 900 XP no total',
      progress({ metric: 'xp_total', current: 100, target: 1000 }),
    ],
    [
      'Faltam 4 dias de acesso',
      progress({ metric: 'access_days', current: 1, target: 5 }),
    ],
    [
      'Faltam 2 dias de sequência de acesso',
      progress({ metric: 'streak', current: 3, target: 5 }),
    ],
    [
      'Falta 1 dia de sequência de acesso',
      progress({ metric: 'streak', current: 4, target: 5 }),
    ],
    [
      'Falta 1 XP na temporada',
      progress({ metric: 'xp_season', current: 99, target: 100 }),
    ],
    [
      'É preciso estar entre os 10 primeiros da temporada',
      progress({ metric: 'rank', current: 0, target: 10 }),
    ],
    [
      'A conquista necessária ainda está bloqueada',
      progress({
        metric: 'achievement',
        current: false,
        target: 'primeiro-login',
      }),
    ],
  ])('escreve "%s"', (expected, condition) => {
    expect(missingMessage(condition)).toBe(expected);
  });
});

describe('evaluateRequirement', () => {
  const any: UnlockRule = {
    mode: 'any',
    conditions: [{ metric: 'xp_total', min: 10 }],
  };

  it('sem regra nem conquista legada está liberado e sem condições', () => {
    expect(
      evaluateRequirement(
        { unlock_rule: null, required_achievement_slug: null },
        facts(),
      ),
    ).toEqual({ met: true, mode: 'all', conditions: [] });
  });

  it('a conquista legada vale como E, mesmo com regra em modo any já cumprida', () => {
    const target = { unlock_rule: any, required_achievement_slug: 'veterano' };
    const blocked = evaluateRequirement(target, facts({ xpTotal: 50 }));
    expect(blocked.met).toBe(false);
    expect(blocked.conditions.map((condition) => condition.metric)).toEqual([
      'xp_total',
      'achievement',
    ]);
    const open = evaluateRequirement(
      target,
      facts({ xpTotal: 50, unlockedAchievements: new Set(['veterano']) }),
    );
    expect(open.met).toBe(true);
  });

  it('informa o modo da regra e marca só a conquista legada como obrigatória', () => {
    const target = { unlock_rule: any, required_achievement_slug: 'veterano' };
    const view = evaluateRequirement(target, facts());
    expect(view.mode).toBe('any');
    expect(view.conditions[0]).not.toHaveProperty('required');
    expect(view.conditions[1]).toMatchObject({
      metric: 'achievement',
      required: true,
    });
  });

  it('sem regra o modo é all e a conquista legada continua obrigatória', () => {
    const view = evaluateRequirement(
      { unlock_rule: null, required_achievement_slug: 'veterano' },
      facts(),
    );
    expect(view.mode).toBe('all');
    expect(view.conditions).toEqual([
      expect.objectContaining({ metric: 'achievement', required: true }),
    ]);
  });
});

describe('assertUnlockMet', () => {
  it('lança 400 com a mensagem da primeira condição que falta', () => {
    const view = {
      met: false,
      mode: 'all' as const,
      conditions: [
        progress({ metric: 'xp_total', current: 20, target: 10, met: true }),
        progress({ metric: 'streak', current: 3, target: 5 }),
      ],
    };
    expect(() => assertUnlockMet(view)).toThrow(
      new BadRequestException('Faltam 2 dias de sequência de acesso'),
    );
  });

  it('não lança quando liberado', () => {
    expect(() =>
      assertUnlockMet({ met: true, mode: 'all', conditions: [] }),
    ).not.toThrow();
  });
});

describe('resolveUnlocks', () => {
  it('carrega os fatos uma vez para a união das métricas de todos os alvos', async () => {
    const load = jest
      .fn()
      .mockResolvedValue(facts({ streak: 5, xpSeason: 10 }));
    const a = {
      unlock_rule: {
        mode: 'all',
        conditions: [{ metric: 'streak', min: 5 }],
      } as UnlockRule,
    };
    const b = {
      unlock_rule: {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 3, scope: 'empresa' }],
      } as UnlockRule,
      required_achievement_slug: 'veterano',
    };
    const c = { unlock_rule: null };
    const result = await resolveUnlocks({ load } as never, 7, [a, b, c]);
    expect(load).toHaveBeenCalledTimes(1);
    const [userId, needs, scopes] = load.mock.calls[0] as [
      number,
      Set<string>,
      Set<string>,
    ];
    expect(userId).toBe(7);
    expect([...needs].sort()).toEqual(['achievement', 'rank', 'streak']);
    expect([...scopes]).toEqual(['empresa']);
    expect(result.get(a)?.met).toBe(true);
    expect(result.get(b)?.met).toBe(false);
    expect(result.get(c)).toEqual({ met: true, mode: 'all', conditions: [] });
  });

  it('não consulta fatos quando ninguém tem regra', async () => {
    const load = jest.fn();
    const target = { unlock_rule: null, required_achievement_slug: null };
    const result = await resolveUnlocks({ load } as never, 7, [target]);
    expect(load).not.toHaveBeenCalled();
    expect(result.get(target)?.met).toBe(true);
  });
});

describe('assertUnlocked (compra)', () => {
  it('pede carga estrita e propaga a falha: sem avaliar, não compra', async () => {
    const load = jest.fn().mockRejectedValue(new Error('redis fora'));
    const target = {
      unlock_rule: {
        mode: 'all',
        conditions: [{ metric: 'xp_season', min: 10 }],
      } as UnlockRule,
    };
    await expect(assertUnlocked({ load } as never, 7, target)).rejects.toThrow(
      'redis fora',
    );
    expect(load).toHaveBeenCalledWith(7, expect.anything(), expect.anything(), {
      strict: true,
    });
  });
});
