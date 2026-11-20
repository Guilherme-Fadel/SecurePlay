import { NotFoundException } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { rankKey, turmaKey } from './rank-key';
import { resolveCompanyParameters } from '../config/features';

interface Entry {
  rankKey: string;
  position: number | null;
  name: string;
  value: number;
  stats: Record<string, number>;
  mine?: boolean;
  companyName?: string | null;
  weeklyChange?: number | null;
  points?: number;
}
interface Board {
  scope: string;
  unit?: string;
  category?: string;
  leaderboard: Entry[];
  top: Entry[];
  currentUser: Entry | null;
  totalParticipants: number;
  viewerParticipates: boolean;
  weeklyDataAvailable: boolean;
  weeklyPositionChange: number | null;
}

const NOW = new Date('2026-11-19T12:00:00-03:00');
const WEEK = '2026-11-02';
const OPTED_OUT = 5;

interface User {
  id: number;
  nick: string;
  empresa: number;
  role?: string;
  trial?: boolean;
}
const USERS: User[] = [
  { id: 7, nick: 'Eu', empresa: 3 },
  { id: 11, nick: 'Ana', empresa: 3 },
  { id: 12, nick: 'Beto', empresa: 3 },
  { id: 13, nick: 'Caio', empresa: 3 },
  { id: 21, nick: 'Duda', empresa: 4 },
  { id: 31, nick: 'Eva', empresa: OPTED_OUT },
];
const COMPANIES: Record<number, string> = {
  3: 'Escola A',
  4: 'Escola B',
  5: 'Escola Fora',
};
const XP: Record<number, number> = {
  7: 50,
  11: 100,
  12: 100,
  13: 0,
  21: 400,
  31: 999,
};
const CHECKINS: Array<[number, string, number]> = [
  [7, '2026-11-18', 2],
  [11, '2026-11-18', 5],
  [12, '2026-11-18', 5],
  [12, '2026-10-20', 9],
  [13, '2026-10-31', 4],
  [21, '2026-11-18', 1],
  [31, '2026-11-18', 50],
];
// usuario_stats.current_streak (id, sequência atual, last_checkin_date); vazio por padrão.
let STATS: Array<[number, number, string | null]> = [];
const CHALLENGES: Array<[number, number, string]> = [
  [11, 1, '2026-11-03 10:00:00'],
  [11, 1, '2026-11-10 10:00:00'],
  [11, 1, '2026-11-01 00:00:00'],
  [11, 1, '2026-10-31 23:59:59'],
  [11, 0, '2026-11-05 10:00:00'],
  [12, 1, '2026-11-04 10:00:00'],
  [21, 1, '2026-11-08 10:00:00'],
  [31, 1, '2026-11-08 10:00:00'],
];
const MEMBERS: Array<[number, number, string, number]> = [
  [7, 100, '7A', 3],
  [11, 100, '7A', 3],
  [12, 100, '7A', 3],
  [13, 101, '8B', 3],
  [21, 200, '9C', 4],
  [31, 300, 'Fora', OPTED_OUT],
  // vínculo inconsistente: aluno da escola 3 numa turma de escola que não participa
  [12, 301, 'Vazada', OPTED_OUT],
];

function build(
  viewer: User = USERS[0],
  parameters = resolveCompanyParameters({ globalRankingEnabled: true }),
) {
  const where: string[] = [];
  const queries: Array<{ sql: string; params: unknown[] }> = [];
  const makeBuilder = () => {
    const recorded: string[] = [];
    const builder: Record<string, jest.Mock> = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn((sql: string) => {
        recorded.push(sql);
        where.push(sql);
        return builder;
      }),
      getOne: jest.fn().mockResolvedValue({
        usuario: {
          empresa: { id: viewer.empresa, nome: COMPANIES[viewer.empresa] },
          role: viewer.role ?? 'user',
          nickname: viewer.nick,
          trial_started_at: viewer.trial ? new Date() : null,
        },
      }),
      // Reproduz o filtro do SQL: papel aluno, escola ou elegibilidade ao global.
      getMany: jest.fn(() => {
        const company = recorded.some((s) => s.includes('empresaId'));
        const global = recorded.some((s) => s.includes('globalRankingEnabled'));
        return Promise.resolve(
          USERS.filter((u) => (company ? u.empresa === viewer.empresa : true))
            .filter((u) => !(global && u.empresa === OPTED_OUT))
            .map((u) => ({
              usuario_id: u.id,
              total_points: 100,
              usuario: {
                nickname: u.nick,
                name: `Nome ${u.nick}`,
                empresa_id: u.empresa,
              },
            })),
        );
      }),
    };
    return builder;
  };
  const ids = (params: unknown[]) =>
    params.filter((p): p is number => typeof p === 'number');
  const dataSource = {
    getRepository: jest.fn().mockReturnValue({
      find: jest.fn().mockResolvedValue([]),
      findOne: jest.fn().mockResolvedValue({ id: 3, nome: 'Escola A' }),
    }),
    query: jest.fn((sql: string, params: unknown[] = []) => {
      queries.push({ sql, params });
      const who = ids(params);
      if (sql.includes('FROM daily_checkin')) {
        const [from, to] = params.filter((p) => typeof p === 'string');
        const inWindow = (day: string | null) =>
          !from || (day !== null && day >= from && day < to);
        const best: Record<number, number> = {};
        const put = (id: number, v: number) => {
          best[id] = Math.max(best[id] ?? 0, v);
        };
        for (const [id, day, s] of CHECKINS)
          if (who.includes(id) && inWindow(day)) put(id, s);
        for (const [id, s, last] of STATS)
          if (who.includes(id) && s > 0 && inWindow(last)) put(id, s);
        return Promise.resolve(
          Object.entries(best).map(([usuario_id, value]) => ({
            usuario_id: +usuario_id,
            value,
          })),
        );
      }
      if (sql.includes('FROM usuario_challenge')) {
        const [from, to] = params.filter((p) => typeof p === 'string');
        const counts: Record<number, number> = {};
        for (const [id, done, at] of CHALLENGES)
          if (who.includes(id) && done && (!from || (at >= from && at < to)))
            counts[id] = (counts[id] ?? 0) + 1;
        return Promise.resolve(
          Object.entries(counts).map(([usuario_id, value]) => ({
            usuario_id: +usuario_id,
            value,
          })),
        );
      }
      if (sql.includes('FROM turma_aluno')) {
        // Reproduz o filtro de escopo do SQL: escola pedida ou escola elegível ao global.
        let rows = MEMBERS.filter(([id]) => who.includes(id));
        if (sql.includes('t.empresa_id = ?'))
          rows = rows.filter(([, , , e]) => e === params[params.length - 1]);
        else if (sql.includes('globalRankingEnabled'))
          rows = rows.filter(([, , , e]) => e !== OPTED_OUT);
        return Promise.resolve(
          rows.map(([usuario_id, turma_id, nome, empresa]) => ({
            usuario_id,
            turma_id,
            nome,
            empresa_nome: COMPANIES[empresa],
          })),
        );
      }
      return Promise.resolve([]);
    }),
    transaction: jest.fn(),
  };
  const redis = {
    get: jest.fn().mockResolvedValue(null),
    mget: jest.fn((keys: string[]) =>
      Promise.resolve(
        keys.map((key) => {
          const match = new RegExp(`week:${WEEK}:xp:(\\d+)$`).exec(key);
          return match ? String(XP[Number(match[1])]) : null;
        }),
      ),
    ),
  };
  const service = new DashboardService(
    {
      findOne: jest
        .fn()
        .mockResolvedValue({ usuario_id: viewer.id, total_points: 500 }),
      createQueryBuilder: jest.fn(makeBuilder),
    } as never,
    dataSource as never,
    {} as never,
    redis as never,
    {} as never,
    {} as never,
    { generatePresignedGetUrl: jest.fn() } as never,
    {} as never,
    {
      forUser: jest.fn().mockResolvedValue(parameters),
      requireFeature: jest.fn().mockResolvedValue(parameters),
    } as never,
  );
  const ranking = (
    scope: 'global' | 'company',
    options: Record<string, unknown> = {},
  ) =>
    service.getRanking(
      viewer.id,
      scope,
      true,
      options,
    ) as unknown as Promise<Board>;
  return { service, ranking, queries, where };
}

beforeAll(() => {
  jest.useFakeTimers({
    now: NOW,
    doNotFake: [
      'nextTick',
      'setImmediate',
      'clearImmediate',
      'setTimeout',
      'clearTimeout',
      'setInterval',
      'clearInterval',
      'queueMicrotask',
      'performance',
      'hrtime',
    ],
  });
  process.env.RANKING_KEY_SECRET = 'segredo-de-teste';
});
afterAll(() => jest.useRealTimers());
afterEach(() => {
  STATS = [];
});

const names = (entries: Array<{ name: string }>) => entries.map((e) => e.name);

describe('ranking por categoria: alunos', () => {
  it('sequência: janela da temporada, empate divide a posição e 0 fica fora', async () => {
    const { ranking } = build();
    const r = await ranking('company', { category: 'streak' });
    // Beto tem 9 em outubro (fora da janela): vale 5; Caio só tem outubro: fora.
    expect(r.leaderboard.map((e) => [e.name, e.position, e.value])).toEqual([
      ['Ana', 1, 5],
      ['Beto', 1, 5],
      ['Eu', 3, 2],
    ]);
    expect(r.totalParticipants).toBe(3);
    expect(r.category).toBe('streak');
    expect(r.unit).toBe('students');
  });

  it('sequência: current_streak do usuario_stats entra na temporada só com last_checkin_date na janela', async () => {
    // Ana: 5 em check-ins; Caio: sem check-ins no mês, mas current_streak 4 em 17/11; Beto: 12 em outubro (fora).
    STATS = [
      [13, 4, '2026-11-17'],
      [12, 12, '2026-10-31'],
      [11, 3, '2026-11-18'],
    ];
    const { ranking } = build();
    const r = await ranking('company', { category: 'streak' });
    expect(r.leaderboard.map((e) => [e.name, e.position, e.value])).toEqual([
      ['Ana', 1, 5],
      ['Beto', 1, 5],
      ['Caio', 3, 4],
      ['Eu', 4, 2],
    ]);
    expect(r.leaderboard[2].stats.streak).toBe(4);
  });

  it('sequência: total considera o maior entre check-ins e usuario_stats, e sequência de 1 dia conta', async () => {
    STATS = [
      [13, 1, '2026-01-05'],
      [11, 20, '2026-03-02'],
    ];
    const { ranking } = build();
    const r = await ranking('company', {
      category: 'streak',
      mode: 'total',
      selectedSeason: null,
    });
    expect(r.leaderboard.map((e) => [e.name, e.value])).toEqual([
      ['Ana', 20],
      ['Beto', 9],
      ['Caio', 4],
      ['Eu', 2],
    ]);
    expect(r.currentUser?.stats.streak).toBe(2);
  });

  it('desafios: só concluídos dentro da janela, com virada em Brasília', async () => {
    const { ranking } = build();
    const r = await ranking('company', { category: 'challenges' });
    // Ana: 01/11 00:00:00 conta; 31/10 23:59:59 e o não concluído não contam.
    expect(r.leaderboard.map((e) => [e.name, e.position, e.value])).toEqual([
      ['Ana', 1, 3],
      ['Beto', 2, 1],
    ]);
    expect(names(r.leaderboard)).not.toContain('Caio');
  });

  it('total: maior sequência de todos os tempos e todos os desafios concluídos', async () => {
    const { ranking } = build();
    const streak = await ranking('company', {
      category: 'streak',
      mode: 'total',
      selectedSeason: null,
    });
    expect(streak.leaderboard[0]).toMatchObject({
      name: 'Beto',
      position: 1,
      value: 9,
    });
    expect(names(streak.leaderboard)).toContain('Caio');
    const challenges = await ranking('company', {
      category: 'challenges',
      mode: 'total',
      selectedSeason: null,
    });
    expect(challenges.leaderboard[0]).toMatchObject({ name: 'Ana', value: 4 });
  });

  it('cada entrada traz as três métricas e o XP em points', async () => {
    const { ranking } = build();
    const r = await ranking('company', { category: 'challenges' });
    expect(r.leaderboard[0].stats).toEqual({
      xp: 100,
      streak: 5,
      challenges: 3,
    });
    expect(r.leaderboard[0].points).toBe(100);
    expect(r.top).toHaveLength(2);
  });

  it('xp explícito deixa de fora quem tem 0 e mantém a mudança semanal', async () => {
    const { ranking } = build();
    const r = await ranking('company', { category: 'xp' });
    expect(names(r.leaderboard)).toEqual(['Ana', 'Beto', 'Eu']);
    expect(r.leaderboard[0].weeklyChange).toBe(0);
    expect(r.weeklyDataAvailable).toBe(true);
  });

  it('weeklyChange só existe em xp no período atual', async () => {
    const { ranking } = build();
    const streak = await ranking('company', { category: 'streak' });
    expect(streak.leaderboard.every((e) => e.weeklyChange === null)).toBe(true);
    const total = await ranking('company', {
      category: 'xp',
      mode: 'total',
      selectedSeason: null,
    });
    expect(total.leaderboard.every((e) => e.weeklyChange === null)).toBe(true);
  });

  it('currentUser tem o mesmo formato, com value e stats; sem valor fica sem posição', async () => {
    const { ranking } = build();
    const streak = await ranking('company', { category: 'streak' });
    expect(streak.currentUser).toMatchObject({
      rankKey: rankKey(7),
      position: 3,
      value: 2,
      isCurrentUser: true,
      stats: { xp: 50, streak: 2, challenges: 0 },
    });
    const challenges = await ranking('company', { category: 'challenges' });
    expect(challenges.currentUser).toMatchObject({ position: null, value: 0 });
    expect(challenges.viewerParticipates).toBe(true);
  });

  it('sem posição (valor 0) não há mudança semanal, nem na entrada nem no resumo', async () => {
    const { ranking } = build({ id: 13, nick: 'Caio', empresa: 3 });
    const r = await ranking('company', { category: 'xp' });
    expect(r.currentUser).toMatchObject({ position: null, value: 0 });
    expect(r.currentUser?.weeklyChange).toBeNull();
    expect(r.weeklyPositionChange).toBeNull();
    // Quem tem posição continua com o número.
    expect(r.leaderboard[0].weeklyChange).toBe(0);
  });

  it('gestão visualiza sem participar', async () => {
    const { ranking } = build({
      id: 7,
      nick: 'Gestor',
      empresa: 3,
      role: 'admin',
    });
    const r = await ranking('company', { category: 'streak' });
    expect(r.currentUser).toBeNull();
    expect(r.viewerParticipates).toBe(false);
    expect(r.leaderboard).toHaveLength(3);
  });

  it('usa uma consulta agregada por métrica, não uma por aluno', async () => {
    const { ranking, queries } = build();
    await ranking('company', { category: 'streak' });
    const sql = queries.map((q) => q.sql);
    expect(sql.filter((s) => s.includes('FROM daily_checkin'))).toHaveLength(1);
    expect(
      sql.filter((s) => s.includes('FROM usuario_challenge')),
    ).toHaveLength(1);
  });

  it('reaproveita o cache com categoria e unidade na chave', async () => {
    const { ranking, queries } = build();
    const metric = () =>
      queries.filter((q) => /daily_checkin|usuario_challenge/.test(q.sql))
        .length;
    await ranking('company', { category: 'streak' });
    const before = metric();
    await ranking('company', { category: 'streak' });
    expect(metric()).toBe(before);
    await ranking('company', { category: 'challenges' });
    expect(metric()).toBeGreaterThan(before);
  });
});

describe('ranking por categoria: turmas (soma dos alunos participantes)', () => {
  it('soma XP, sequência e desafios da turma; 0 fica fora', async () => {
    const { ranking } = build();
    const r = await ranking('company', { category: 'xp', unit: 'turmas' });
    expect(r.unit).toBe('turmas');
    expect(r.leaderboard).toEqual([
      {
        rankKey: turmaKey(100),
        position: 1,
        name: '7A',
        companyName: null,
        studentCount: 3,
        value: 250,
        stats: { xp: 250, streak: 12, challenges: 4 },
        mine: true,
      },
    ]);
    expect(r.totalParticipants).toBe(1);
  });

  it('turmas somam a sequência que vem do usuario_stats', async () => {
    STATS = [
      [13, 4, '2026-11-17'], // turma 8B, sem check-ins na temporada
      [12, 7, '2026-10-30'], // fora da janela: não soma
    ];
    const { ranking } = build();
    const r = await ranking('company', { category: 'streak', unit: 'turmas' });
    expect(r.leaderboard.map((t) => [t.name, t.value])).toEqual([
      ['7A', 12],
      ['8B', 4],
    ]);
  });

  it('ordena pela soma da categoria pedida', async () => {
    const { ranking } = build();
    const r = await ranking('global', {
      category: 'challenges',
      unit: 'turmas',
    });
    expect(r.leaderboard.map((t) => [t.name, t.value])).toEqual([
      ['7A', 4],
      ['9C', 1],
    ]);
  });

  it('company mostra só as turmas da escola; global mostra as escolas elegíveis, com o nome da escola', async () => {
    const { ranking } = build();
    const company = await ranking('company', { unit: 'turmas' });
    expect(names(company.leaderboard)).toEqual(['7A']);
    const global = await ranking('global', { unit: 'turmas' });
    expect(
      global.leaderboard.map((t) => [t.name, t.companyName, t.mine]),
    ).toEqual([
      ['9C', 'Escola B', false],
      ['7A', 'Escola A', true],
    ]);
    expect(global.currentUser).toMatchObject({
      name: '7A',
      position: 2,
      mine: true,
    });
  });

  it('não expõe dado de aluno nem id interno', async () => {
    const { ranking } = build();
    const r = await ranking('global', { category: 'streak', unit: 'turmas' });
    const json = JSON.stringify(r);
    for (const leak of [
      'Ana',
      'Beto',
      'Duda',
      'Eu"',
      'Nome ',
      'usuarioId',
      'look',
      'profileImageUrl',
    ])
      expect(json).not.toContain(leak);
    for (const entry of [...r.leaderboard, r.currentUser as Entry])
      expect(Object.keys(entry).sort()).toEqual([
        'companyName',
        'mine',
        'name',
        'position',
        'rankKey',
        'stats',
        'studentCount',
        'value',
      ]);
  });

  it('quem não tem turma fica sem currentUser; gestão nunca tem mine', async () => {
    const lone = build({ id: 13, nick: 'Caio', empresa: 3 });
    const r = await lone.ranking('company', { unit: 'turmas' });
    // Caio está na 8B (soma 0): currentUser sem posição, turma fora da lista.
    expect(r.currentUser).toMatchObject({
      name: '8B',
      position: null,
      value: 0,
    });
    const admin = build({ id: 7, nick: 'Gestor', empresa: 3, role: 'admin' });
    const a = await admin.ranking('company', { unit: 'turmas' });
    expect(a.currentUser).toBeNull();
    expect(a.leaderboard.every((t) => t.mine === false)).toBe(true);
    expect(a.viewerParticipates).toBe(false);
  });
});

describe('regras do ranking global por escola nas novas categorias', () => {
  const idsIn = (
    queries: Array<{ sql: string; params: unknown[] }>,
    table: string,
  ) =>
    queries
      .filter((q) => q.sql.includes(table))
      .flatMap((q) => q.params.filter((p) => typeof p === 'number'));

  it.each(['streak', 'challenges'])(
    'global/%s não inclui aluno de escola que não participa',
    async (category) => {
      const { ranking, queries, where } = build();
      const r = await ranking('global', { category });
      expect(where.some((s) => s.includes('globalRankingEnabled'))).toBe(true);
      expect(where.some((s) => s.includes('rankingEnabled'))).toBe(true);
      expect(where.some((s) => s.includes('trial_started_at IS NULL'))).toBe(
        true,
      );
      expect(names(r.leaderboard)).not.toContain('Eva');
      expect(r.leaderboard.map((e) => e.rankKey)).not.toContain(rankKey(31));
      const table =
        category === 'streak' ? 'daily_checkin' : 'usuario_challenge';
      expect(idsIn(queries, table)).not.toContain(31);
    },
  );

  it('global/turmas não inclui as turmas da escola que não participa', async () => {
    const { ranking, queries } = build();
    const r = await ranking('global', { category: 'streak', unit: 'turmas' });
    expect(names(r.leaderboard)).toEqual(['7A', '9C']);
    expect(JSON.stringify(r)).not.toContain('Escola Fora');
    expect(JSON.stringify(r)).not.toContain(turmaKey(300));
    expect(idsIn(queries, 'FROM turma_aluno')).not.toContain(31);
  });

  it('escola que oculta o global: pedido global vira o ranking da escola, como no XP', async () => {
    const hidden = resolveCompanyParameters({ globalRankingEnabled: false });
    const { ranking, where } = build(USERS[0], hidden);
    const students = await ranking('global', { category: 'streak' });
    expect(students.scope).toBe('company');
    expect(names(students.leaderboard)).not.toContain('Duda');
    expect(where.some((s) => s.includes('globalRankingEnabled'))).toBe(false);
    const turmas = await ranking('global', { category: 'xp', unit: 'turmas' });
    expect(turmas.scope).toBe('company');
    expect(names(turmas.leaderboard)).toEqual(['7A']);
  });

  it('trial vê só o ranking da escola, em qualquer categoria e unidade', async () => {
    const { ranking } = build({ id: 7, nick: 'Eu', empresa: 3, trial: true });
    const students = await ranking('global', { category: 'challenges' });
    expect(students.scope).toBe('company');
    expect(names(students.leaderboard)).not.toContain('Duda');
    const turmas = await ranking('global', { unit: 'turmas' });
    expect(turmas.scope).toBe('company');
    expect(names(turmas.leaderboard)).toEqual(['7A']);
  });

  it('turma de escola fora do escopo não vaza, mesmo com vínculo inconsistente', async () => {
    const { ranking, queries } = build();
    const global = await ranking('global', { unit: 'turmas' });
    const company = await ranking('company', { unit: 'turmas' });
    for (const r of [global, company]) {
      expect(names(r.leaderboard)).not.toContain('Vazada');
      expect(names(r.leaderboard)).not.toContain('Fora');
      expect(JSON.stringify(r)).not.toContain(turmaKey(301));
    }
    const sqls = queries
      .filter((q) => q.sql.includes('FROM turma_aluno'))
      .map((q) => q.sql);
    expect(sqls.some((s) => s.includes('t.empresa_id = ?'))).toBe(true);
    expect(sqls.some((s) => s.includes('globalRankingEnabled'))).toBe(true);
    // Beto (escola 3) também está na turma 7A: a soma dela não muda.
    expect(global.leaderboard.find((t) => t.name === '7A')?.value).toBe(250);
  });

  it('ranking desligado na escola continua recusado (404)', async () => {
    const off = resolveCompanyParameters({ rankingEnabled: false });
    const { service } = build(USERS[0], off);
    await expect(
      service.getRanking(7, 'company', true, {
        parameters: off,
        category: 'streak',
      }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});

describe('regressão: sem category/unit a resposta é a de antes', () => {
  it('não traz campos novos, não consulta métricas e mantém quem tem 0 XP', async () => {
    const { ranking, queries } = build();
    const r = await ranking('company');
    expect(names(r.leaderboard)).toContain('Caio');
    expect(r.leaderboard).toHaveLength(4);
    for (const key of ['value', 'stats'])
      expect(r.leaderboard[0]).not.toHaveProperty(key);
    expect(r).not.toHaveProperty('category');
    expect(r).not.toHaveProperty('unit');
    expect(queries.some((q) => q.sql.includes('daily_checkin'))).toBe(false);
    expect(queries.some((q) => q.sql.includes('usuario_challenge'))).toBe(
      false,
    );
    expect(queries.some((q) => q.sql.includes('turma_aluno'))).toBe(false);
  });
});
