import {
  chunkIds,
  loadMetric,
  metricWindow,
  parseRankingView,
  rankByValue,
  TtlCache,
} from './ranking-category';

describe('parseRankingView', () => {
  it('sem parâmetros deixa tudo indefinido (resposta legada)', () => {
    expect(parseRankingView()).toEqual({
      category: undefined,
      unit: undefined,
    });
  });

  it('aceita as categorias e unidades conhecidas', () => {
    expect(parseRankingView('streak', 'turmas')).toEqual({
      category: 'streak',
      unit: 'turmas',
    });
    expect(parseRankingView('challenges', undefined).category).toBe(
      'challenges',
    );
    expect(parseRankingView('xp', 'students').unit).toBe('students');
  });

  it.each([
    ['sequence', undefined],
    [undefined, 'classes'],
    [['xp', 'streak'], undefined],
    [undefined, ['turmas']],
    ['', undefined],
  ])('rejeita valor inválido (%p, %p)', (category, unit) => {
    expect(() => parseRankingView(category, unit)).toThrow();
  });
});

describe('metricWindow', () => {
  it('temporada atual e encerrada usam o mês inteiro, em datas de Brasília', () => {
    expect(metricWindow('current', '2026-10')).toEqual({
      from: '2026-10-01',
      to: '2026-11-01',
    });
    expect(metricWindow('season', '2026-12')).toEqual({
      from: '2026-12-01',
      to: '2027-01-01',
    });
  });

  it('total não tem janela', () => {
    expect(metricWindow('total', null)).toBeNull();
  });
});

describe('rankByValue', () => {
  const byId = (a: { id: number }, b: { id: number }) => a.id - b.id;

  it('ordena do maior para o menor, empate divide a posição e o próximo pula', () => {
    const rows = rankByValue<{ id: number; value: number }>(
      [
        { id: 4, value: 5 },
        { id: 1, value: 9 },
        { id: 3, value: 5 },
        { id: 2, value: 1 },
      ],
      byId,
    );
    expect(rows.map((r): [number, number] => [r.id, r.position])).toEqual([
      [1, 1],
      [3, 2],
      [4, 2],
      [2, 4],
    ]);
  });

  it('quem tem valor 0 fica de fora', () => {
    const rows = rankByValue<{ id: number; value: number }>(
      [
        { id: 1, value: 0 },
        { id: 2, value: 3 },
      ],
      byId,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(2);
  });
});

describe('chunkIds', () => {
  it('divide listas longas', () => {
    expect(chunkIds([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
    expect(chunkIds([], 2)).toEqual([]);
  });
});

describe('loadMetric', () => {
  const dataSource = (rows: unknown[]) => {
    const query = jest.fn().mockResolvedValue(rows);
    return { query, ds: { query } as never };
  };

  it('sequência: uma consulta agregada com check-ins e usuario_stats na mesma janela', async () => {
    const { query, ds } = dataSource([
      { usuario_id: 1, value: '7' },
      { usuario_id: 2, value: 3 },
    ]);
    const map = await loadMetric(ds, 'streak', [1, 2, 3], {
      from: '2026-10-01',
      to: '2026-11-01',
    });
    expect(map.get(1)).toBe(7);
    expect(map.get(2)).toBe(3);
    expect(map.get(3)).toBeUndefined();
    expect(query).toHaveBeenCalledTimes(1);
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM daily_checkin');
    expect(sql).toContain('FROM usuario_stats');
    expect(sql).toContain('MAX(streak)');
    expect(sql).toContain('GROUP BY usuario_id');
    expect(sql).toContain('day >= ? AND day < ?');
    expect(sql).toContain('last_checkin_date >= ? AND last_checkin_date < ?');
    expect(params).toEqual([
      ...[1, 2, 3, '2026-10-01', '2026-11-01'],
      ...[1, 2, 3, '2026-10-01', '2026-11-01'],
    ]);
  });

  describe('sequência: valor calculado (fake que aplica o mesmo SQL)', () => {
    type Tables = {
      checkins: Array<[number, string, number]>;
      stats: Array<[number, number, string | null]>;
    };
    // Aplica ao fake as mesmas regras do SQL: janela por day / last_checkin_date, current_streak > 0.
    const evaluate = (tables: Tables) => {
      const query = jest.fn((_sql: string, params: unknown[]) => {
        const ids = params.filter((p): p is number => typeof p === 'number');
        const [from, to] = params.filter(
          (p): p is string => typeof p === 'string',
        );
        const inWindow = (day: string | null) =>
          !from || (day !== null && day >= from && day < to);
        const best = new Map<number, number>();
        const put = (id: number, v: number) =>
          best.set(id, Math.max(best.get(id) ?? 0, v));
        for (const [id, day, streak] of tables.checkins)
          if (ids.includes(id) && inWindow(day)) put(id, streak);
        for (const [id, current, last] of tables.stats)
          if (ids.includes(id) && current > 0 && inWindow(last))
            put(id, current);
        return Promise.resolve(
          [...best].map(([usuario_id, value]) => ({ usuario_id, value })),
        );
      });
      return { query: query as never } as never;
    };
    const window = { from: '2026-11-01', to: '2026-12-01' };

    it('total usa current_streak quando não há check-ins', async () => {
      const ds = evaluate({ checkins: [], stats: [[1, 6, '2026-08-10']] });
      expect((await loadMetric(ds, 'streak', [1], null)).get(1)).toBe(6);
    });

    it('total fica com o maior entre check-ins e current_streak', async () => {
      const ds = evaluate({
        checkins: [
          [1, '2026-11-10', 9],
          [2, '2026-11-10', 2],
        ],
        stats: [
          [1, 4, '2026-11-12'],
          [2, 5, '2026-11-12'],
        ],
      });
      const map = await loadMetric(ds, 'streak', [1, 2], null);
      expect([map.get(1), map.get(2)]).toEqual([9, 5]);
    });

    it('temporada conta current_streak só com last_checkin_date na janela', async () => {
      const ds = evaluate({
        checkins: [],
        stats: [
          [1, 3, '2026-11-18'],
          [2, 3, '2026-10-31'],
          [3, 3, '2026-12-01'],
          [4, 1, '2026-11-01'],
          [5, 3, null],
        ],
      });
      const map = await loadMetric(ds, 'streak', [1, 2, 3, 4, 5], window);
      expect([...map]).toEqual([
        [1, 3],
        [4, 1],
      ]);
    });

    it('temporada fica com o maior entre os check-ins da janela e o current_streak', async () => {
      const ds = evaluate({
        checkins: [
          [1, '2026-11-05', 8],
          [1, '2026-10-20', 12],
          [2, '2026-11-05', 2],
        ],
        stats: [
          [1, 4, '2026-11-18'],
          [2, 6, '2026-11-18'],
        ],
      });
      const map = await loadMetric(ds, 'streak', [1, 2], window);
      expect([map.get(1), map.get(2)]).toEqual([8, 6]);
    });

    it('zero fica fora e sequência de 1 dia conta', async () => {
      const ds = evaluate({
        checkins: [],
        stats: [
          [1, 0, '2026-11-18'],
          [2, 1, '2026-11-18'],
        ],
      });
      const map = await loadMetric(ds, 'streak', [1, 2], null);
      expect(map.has(1)).toBe(false);
      expect(map.get(2)).toBe(1);
    });
  });

  it('desafios: conta concluídos com janela de Brasília (limites exatos)', async () => {
    const { query, ds } = dataSource([{ usuario_id: 1, value: 4 }]);
    await loadMetric(ds, 'challenges', [1], {
      from: '2026-10-01',
      to: '2026-11-01',
    });
    const [sql, params] = query.mock.calls[0] as [string, unknown[]];
    expect(sql).toContain('FROM usuario_challenge');
    expect(sql).toContain('completed = 1');
    expect(sql).toContain('completed_at >= ? AND completed_at < ?');
    expect(params).toEqual([1, '2026-10-01 00:00:00', '2026-11-01 00:00:00']);
  });

  it('total: sem janela', async () => {
    const { query, ds } = dataSource([]);
    await loadMetric(ds, 'streak', [1], null);
    await loadMetric(ds, 'challenges', [1], null);
    for (const call of query.mock.calls as Array<[string, unknown[]]>) {
      expect(call[0]).not.toContain('completed_at >=');
      expect(call[0]).not.toContain('day >=');
      expect(call[0]).not.toContain('last_checkin_date >=');
    }
    const [streakCall, challengesCall] = query.mock.calls as Array<
      [string, unknown[]]
    >;
    expect(streakCall[1]).toEqual([1, 1]);
    expect(challengesCall[1]).toEqual([1]);
  });

  it('sem ids não consulta', async () => {
    const { query, ds } = dataSource([]);
    expect((await loadMetric(ds, 'streak', [], null)).size).toBe(0);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('TtlCache', () => {
  it('reaproveita a mesma promessa até limpar e descarta falhas', async () => {
    const cache = new TtlCache<number>(30_000, 10);
    const load = jest.fn().mockResolvedValue(1);
    await cache.get('k', load);
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(1);
    cache.clear();
    await cache.get('k', load);
    expect(load).toHaveBeenCalledTimes(2);
    await expect(
      cache.get('bad', () => Promise.reject(new Error('x'))),
    ).rejects.toThrow('x');
    await cache.get('bad', load);
    expect(load).toHaveBeenCalledTimes(3);
  });
});
