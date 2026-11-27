import { Logger } from '@nestjs/common';
import { Role } from '../auth/roles.enum';
import {
  evaluateRule,
  UnlockFacts,
  UnlockFactsLoader,
} from './unlock-evaluator';
import type { UnlockMetric, UnlockRule } from './unlock-rule';

const facts = (overrides: Partial<UnlockFacts> = {}): UnlockFacts => ({
  xpSeason: 0,
  xpTotal: 0,
  accessDays: 0,
  streak: 0,
  unlockedAchievements: new Set<string>(),
  rank: { empresa: null, global: null },
  ...overrides,
});

describe('evaluateRule', () => {
  const rule = (mode: 'all' | 'any'): UnlockRule => ({
    mode,
    conditions: [
      { metric: 'xp_season', min: 100 },
      { metric: 'streak', min: 5 },
    ],
  });

  it('modo all exige todas as condições e informa o progresso', () => {
    const result = evaluateRule(
      rule('all'),
      facts({ xpSeason: 120, streak: 4 }),
    );
    expect(result.met).toBe(false);
    expect(result.conditions[0]).toMatchObject({
      metric: 'xp_season',
      label: 'XP na temporada',
      current: 120,
      target: 100,
      met: true,
    });
    expect(result.conditions[1]).toMatchObject({
      metric: 'streak',
      label: 'Sequência de acesso',
      current: 4,
      target: 5,
      met: false,
    });
  });

  it('modo any basta uma condição', () => {
    const result = evaluateRule(
      rule('any'),
      facts({ xpSeason: 120, streak: 4 }),
    );
    expect(result.met).toBe(true);
  });

  it('colocação por empresa sem posição (sem empresa ou teste gratuito) não libera', () => {
    const result = evaluateRule(
      {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 10, scope: 'empresa' }],
      },
      facts({ rank: { empresa: null, global: 3 } }),
    );
    expect(result.met).toBe(false);
    expect(result.conditions[0]).toMatchObject({
      label: 'Colocação na temporada',
      met: false,
    });
  });

  it.each(['empresa', 'global'] as const)(
    'a condição de colocação carrega o escopo %s',
    (scope) => {
      const result = evaluateRule(
        { mode: 'all', conditions: [{ metric: 'rank', top: 10, scope }] },
        facts({ rank: { empresa: 4, global: 4 } }),
      );
      expect(result.conditions[0]).toMatchObject({
        metric: 'rank',
        scope,
        current: 4,
        target: 10,
      });
    },
  );

  it('condições que não são de colocação não têm escopo', () => {
    const result = evaluateRule(
      { mode: 'all', conditions: [{ metric: 'streak', min: 2 }] },
      facts(),
    );
    expect(result.conditions[0]).not.toHaveProperty('scope');
  });

  it('o limite da colocação entra', () => {
    const result = evaluateRule(
      {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 10, scope: 'empresa' }],
      },
      facts({ rank: { empresa: 10, global: null } }),
    );
    expect(result.met).toBe(true);
    const out = evaluateRule(
      {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 10, scope: 'global' }],
      },
      facts({ rank: { empresa: 1, global: 11 } }),
    );
    expect(out.met).toBe(false);
  });

  it('regra nula libera', () => {
    expect(evaluateRule(null, facts())).toEqual({ met: true, conditions: [] });
  });

  it('avalia XP total, dias de acesso e conquista', () => {
    const result = evaluateRule(
      {
        mode: 'all',
        conditions: [
          { metric: 'xp_total', min: 500 },
          { metric: 'access_days', min: 7 },
          { metric: 'achievement', slug: 'primeiro-passo' },
        ],
      },
      facts({
        xpTotal: 500,
        accessDays: 6,
        unlockedAchievements: new Set(['primeiro-passo']),
      }),
    );
    expect(result.met).toBe(false);
    expect(
      result.conditions.map((c) => [c.label, c.current, c.target, c.met]),
    ).toEqual([
      ['XP total', 500, 500, true],
      ['Dias de acesso', 6, 7, false],
      ['Conquista', true, 'primeiro-passo', true],
    ]);
  });
});

describe('UnlockFactsLoader', () => {
  const build = (
    options: {
      user?: Record<string, unknown> | null;
      ranking?: unknown;
      rankingError?: boolean;
    } = {},
  ) => {
    const stats = {
      findOne: jest
        .fn()
        .mockResolvedValue({ total_points: 900, current_streak: 3 }),
    };
    const checkins = { count: jest.fn().mockResolvedValue(12) };
    const achievements = {
      find: jest
        .fn()
        .mockResolvedValue([
          { achievement: { slug: 'a-1' } },
          { achievement: { slug: 'b-2' } },
        ]),
    };
    const users = {
      findOne: jest
        .fn()
        .mockResolvedValue(
          options.user === undefined
            ? { role: Role.USER, empresa_id: 4, trial_started_at: null }
            : options.user,
        ),
    };
    const byName: Record<string, unknown> = {
      UsuarioStats: stats,
      DailyCheckin: checkins,
      UsuarioAchievement: achievements,
      Usuario: users,
    };
    const dataSource = {
      getRepository: jest.fn((entity: { name: string }) => byName[entity.name]),
    };
    const redis = { mget: jest.fn().mockResolvedValue(['40', '60']) };
    const dashboard = {
      getRanking: jest.fn(() =>
        options.rankingError
          ? Promise.reject(new Error('ranking desativado'))
          : Promise.resolve(
              options.ranking ?? {
                scope: 'company',
                currentUser: { position: 7, points: 120 },
              },
            ),
      ),
    };
    const loader = new UnlockFactsLoader(
      dataSource as never,
      redis as never,
      dashboard as never,
    );
    return { loader, stats, checkins, achievements, users, redis, dashboard };
  };
  const needs = (...metrics: UnlockMetric[]) => new Set<UnlockMetric>(metrics);

  it('só consulta o que a regra usa', async () => {
    const { loader, stats, checkins, achievements, redis, dashboard, users } =
      build();
    const result = await loader.load(1, needs('xp_total'));
    expect(result).toMatchObject({
      xpTotal: 900,
      xpSeason: 0,
      accessDays: 0,
      streak: 0,
    });
    expect(stats.findOne).toHaveBeenCalledTimes(1);
    expect(checkins.count).not.toHaveBeenCalled();
    expect(achievements.find).not.toHaveBeenCalled();
    expect(redis.mget).not.toHaveBeenCalled();
    expect(dashboard.getRanking).not.toHaveBeenCalled();
    expect(users.findOne).not.toHaveBeenCalled();
  });

  it('carrega temporada, dias de acesso, sequência e conquistas', async () => {
    const { loader, redis } = build();
    const result = await loader.load(
      1,
      needs('xp_season', 'access_days', 'streak', 'achievement'),
    );
    expect(redis.mget).toHaveBeenCalledTimes(1);
    expect(result.accessDays).toBe(12);
    expect(result.streak).toBe(3);
    expect([...result.unlockedAchievements].sort()).toEqual(['a-1', 'b-2']);
  });

  it('colocação da empresa vem do ranking e mapeia empresa para company', async () => {
    const { loader, dashboard } = build();
    const result = await loader.load(1, needs('rank'));
    expect(dashboard.getRanking).toHaveBeenCalledWith(1, 'company', false, {
      includeEntries: false,
    });
    expect(result.rank).toEqual({ empresa: 7, global: null });
  });

  it('só consulta os escopos de colocação pedidos', async () => {
    const empresaOnly = build();
    await empresaOnly.loader.load(1, needs('rank'), new Set(['empresa']));
    expect(empresaOnly.dashboard.getRanking).toHaveBeenCalledTimes(1);
    expect(empresaOnly.dashboard.getRanking).toHaveBeenCalledWith(
      1,
      'company',
      false,
      { includeEntries: false },
    );
    const globalOnly = build();
    await globalOnly.loader.load(1, needs('rank'), new Set(['global']));
    expect(globalOnly.dashboard.getRanking).toHaveBeenCalledTimes(1);
    expect(globalOnly.dashboard.getRanking).toHaveBeenCalledWith(
      1,
      'global',
      false,
      { includeEntries: false },
    );
    const both = build();
    await both.loader.load(1, needs('rank'));
    expect(both.dashboard.getRanking).toHaveBeenCalledTimes(2);
  });

  it('registra aviso sem dados pessoais quando o ranking falha', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const failing = build({ rankingError: true });
    await failing.loader.load(99, needs('rank'), new Set(['empresa']));
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain('company');
    expect(message).toContain('ranking desativado');
    expect(message).not.toContain('99');
    warn.mockRestore();
  });

  it('sem pontos na temporada não há colocação, mesmo empatado em 1º', async () => {
    for (const scope of ['company', 'global'] as const) {
      const { loader } = build({
        ranking: { scope, currentUser: { position: 1, points: 0 } },
      });
      const result = await loader.load(1, needs('rank'));
      expect(result.rank).toEqual({ empresa: null, global: null });
    }
  });

  it('colocação global só vale se o escopo devolvido for global', async () => {
    const global = build({
      ranking: {
        scope: 'global',
        currentUser: { position: 3, points: 80 },
      },
    });
    const withGlobal = await global.loader.load(1, needs('rank'));
    expect(withGlobal.rank.global).toBe(3);
    const fallback = build({
      ranking: {
        scope: 'company',
        currentUser: { position: 3, points: 80 },
      },
    });
    const result = await fallback.loader.load(1, needs('rank'));
    expect(result.rank.global).toBeNull();
  });

  it('colocação fica nula para gestão, sem empresa, teste gratuito ou erro', async () => {
    for (const user of [
      { role: Role.ADMIN, empresa_id: 4, trial_started_at: null },
      { role: Role.USER, empresa_id: null, trial_started_at: null },
      { role: Role.USER, empresa_id: 4, trial_started_at: new Date() },
      null,
    ]) {
      const { loader } = build({ user });
      const result = await loader.load(1, needs('rank'));
      expect(result.rank).toEqual({ empresa: null, global: null });
    }
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const failing = build({ rankingError: true });
    const result = await failing.loader.load(
      1,
      needs('rank'),
      new Set(['empresa']),
    );
    expect(result.rank).toEqual({ empresa: null, global: null });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(String(warn.mock.calls[0][0])).toContain('company');
    warn.mockRestore();
  });
});

describe('UnlockFactsLoader — falha do Redis (XP da temporada)', () => {
  const make = () => {
    const redis = {
      mget: jest.fn().mockRejectedValue(new Error('redis fora')),
    };
    const loader = new UnlockFactsLoader(
      { getRepository: jest.fn() } as never,
      redis as never,
      {} as never,
    );
    return loader;
  };
  const season = new Set<UnlockMetric>(['xp_season']);

  it('leitura da loja degrada: XP 0 e aviso sem dados pessoais', async () => {
    const warn = jest
      .spyOn(Logger.prototype, 'warn')
      .mockImplementation(() => undefined);
    const result = await make().load(4242, season);
    expect(result.xpSeason).toBe(0);
    expect(warn).toHaveBeenCalledTimes(1);
    const message = String(warn.mock.calls[0][0]);
    expect(message).toContain('redis fora');
    expect(message).not.toContain('4242');
    warn.mockRestore();
  });

  it('caminho estrito (compra) propaga a falha', async () => {
    await expect(
      make().load(1, season, undefined, { strict: true }),
    ).rejects.toThrow('redis fora');
  });
});
