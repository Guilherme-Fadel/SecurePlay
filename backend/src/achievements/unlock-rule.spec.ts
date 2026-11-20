import { BadRequestException } from '@nestjs/common';
import { legacyAchievementCondition, parseUnlockRule } from './unlock-rule';

describe('parseUnlockRule', () => {
  it('aceita regra com condições numéricas e devolve igual', () => {
    const rule = {
      mode: 'all',
      conditions: [
        { metric: 'xp_season', min: 100 },
        { metric: 'streak', min: 5 },
      ],
    };
    expect(parseUnlockRule(rule)).toEqual(rule);
  });

  it('aceita colocação com escopo', () => {
    const rule = {
      mode: 'any',
      conditions: [{ metric: 'rank', top: 10, scope: 'empresa' }],
    };
    expect(parseUnlockRule(rule)).toEqual(rule);
  });

  it('aceita conquista com slug válido', () => {
    const rule = {
      mode: 'any',
      conditions: [{ metric: 'achievement', slug: 'elite-nivel-dez' }],
    };
    expect(parseUnlockRule(rule)).toEqual(rule);
  });

  it('recusa colocação sem escopo com mensagem sobre colocação', () => {
    const run = () =>
      parseUnlockRule({
        mode: 'all',
        conditions: [{ metric: 'rank', top: 10 }],
      });
    expect(run).toThrow(BadRequestException);
    expect(run).toThrow(/colocação/);
  });

  it.each([
    [
      'métrica desconhecida',
      { mode: 'all', conditions: [{ metric: 'foo', min: 1 }] },
    ],
    [
      'min negativo',
      { mode: 'all', conditions: [{ metric: 'xp_total', min: -1 }] },
    ],
    [
      'min fracionado',
      { mode: 'all', conditions: [{ metric: 'xp_total', min: 1.5 }] },
    ],
    [
      'sete condições',
      {
        mode: 'all',
        conditions: Array.from({ length: 7 }, () => ({
          metric: 'streak',
          min: 1,
        })),
      },
    ],
    ['modo xor', { mode: 'xor', conditions: [{ metric: 'streak', min: 1 }] }],
    ['sem condições', { mode: 'all', conditions: [] }],
    ['entrada não objeto', 'abc'],
    ['null', null],
    [
      'xp acima do teto',
      { mode: 'all', conditions: [{ metric: 'xp_season', min: 1_000_001 }] },
    ],
    [
      'streak acima do teto',
      { mode: 'all', conditions: [{ metric: 'streak', min: 3651 }] },
    ],
    [
      'rank.top zero',
      {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 0, scope: 'global' }],
      },
    ],
    [
      'rank.top acima do teto',
      {
        mode: 'all',
        conditions: [{ metric: 'rank', top: 1001, scope: 'global' }],
      },
    ],
    [
      'rank escopo inválido',
      { mode: 'all', conditions: [{ metric: 'rank', top: 5, scope: 'mundo' }] },
    ],
    [
      'slug com maiúsculas',
      { mode: 'all', conditions: [{ metric: 'achievement', slug: 'Elite' }] },
    ],
    [
      'slug vazio',
      { mode: 'all', conditions: [{ metric: 'achievement', slug: '' }] },
    ],
    [
      'slug longo',
      {
        mode: 'all',
        conditions: [{ metric: 'achievement', slug: 'a'.repeat(81) }],
      },
    ],
  ])('recusa %s', (_nome, input) => {
    expect(() => parseUnlockRule(input)).toThrow(BadRequestException);
  });

  it('recusa min zero com mensagem de inteiro positivo', () => {
    const run = () =>
      parseUnlockRule({
        mode: 'all',
        conditions: [{ metric: 'xp_season', min: 0 }],
      });
    expect(run).toThrow(BadRequestException);
    expect(run).toThrow(/inteiro positivo entre 1 e 1000000/);
  });

  it('recusa array esparso de condições', () => {
    const conditions: unknown[] = [{ metric: 'streak', min: 1 }];
    conditions[2] = { metric: 'streak', min: 2 };
    expect(() => parseUnlockRule({ mode: 'all', conditions })).toThrow(
      BadRequestException,
    );
  });

  it('aceita os tetos exatos', () => {
    const rule = {
      mode: 'all',
      conditions: [
        { metric: 'xp_season', min: 1_000_000 },
        { metric: 'access_days', min: 3650 },
        { metric: 'rank', top: 1000, scope: 'global' },
        { metric: 'achievement', slug: 'a'.repeat(80) },
      ],
    };
    expect(parseUnlockRule(rule)).toEqual(rule);
  });

  it('descarta campos extras nas condições', () => {
    const parsed = parseUnlockRule({
      mode: 'all',
      conditions: [{ metric: 'streak', min: 2, extra: 'x' }],
    });
    expect(parsed.conditions[0]).toEqual({ metric: 'streak', min: 2 });
  });
});

describe('legacyAchievementCondition', () => {
  it('converte slug em condição de conquista', () => {
    expect(legacyAchievementCondition('elite-nivel-dez')).toEqual({
      metric: 'achievement',
      slug: 'elite-nivel-dez',
    });
  });

  it('devolve null para null', () => {
    expect(legacyAchievementCondition(null)).toBeNull();
  });
});
