import { loadTurmaBoard, toTurmaEntry, viewerTurmaRow } from './ranking-turmas';
import { turmaKey } from './rank-key';

interface Fixture {
  members: Array<{
    usuario_id: number;
    turma_id: number;
    nome: string;
    empresa_nome: string;
  }>;
  streak?: Array<[number, number]>;
  challenges?: Array<[number, number]>;
}

function build(fixture: Fixture) {
  const query = jest.fn((sql: string) => {
    if (sql.includes('FROM turma_aluno'))
      return Promise.resolve(fixture.members);
    const pairs = sql.includes('daily_checkin')
      ? (fixture.streak ?? [])
      : (fixture.challenges ?? []);
    return Promise.resolve(
      pairs.map(([usuario_id, value]) => ({ usuario_id, value })),
    );
  });
  return { query, dataSource: { query } as never };
}

const member = (usuario_id: number, turma_id: number, nome: string) => ({
  usuario_id,
  turma_id,
  nome,
  empresa_nome: 'Escola',
});

describe('loadTurmaBoard (valor = soma dos alunos participantes)', () => {
  const xp = new Map([
    [1, 100],
    [2, 50],
    [3, 120],
    [4, 0],
    [5, 0],
  ]);

  it('soma o XP dos alunos da turma e ordena do maior para o menor', async () => {
    const { dataSource } = build({
      members: [
        member(1, 10, '7A'),
        member(2, 10, '7A'),
        member(3, 11, '8B'),
        member(4, 11, '8B'),
      ],
    });
    const board = await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [1, 2, 3, 4, 5],
      seasonPoints: xp,
      scope: 'company',
      companyId: 3,
    });
    expect(board.ranked.map((t) => [t.name, t.value, t.position])).toEqual([
      ['7A', 150, 1],
      ['8B', 120, 2],
    ]);
    expect(board.ranked[0].studentCount).toBe(2);
    expect(board.ranked[1].studentCount).toBe(2);
  });

  it('soma sequência e desafios e guarda as três somas em stats', async () => {
    const { dataSource } = build({
      members: [member(1, 10, '7A'), member(2, 10, '7A'), member(3, 11, '8B')],
      streak: [
        [1, 4],
        [2, 6],
        [3, 9],
      ],
      challenges: [
        [1, 2],
        [3, 5],
      ],
    });
    const base = {
      dataSource,
      window: null,
      participantIds: [1, 2, 3],
      seasonPoints: xp,
      scope: 'company' as const,
      companyId: 3,
    };
    const bySeq = await loadTurmaBoard({ ...base, category: 'streak' });
    expect(bySeq.ranked.map((t) => [t.name, t.value])).toEqual([
      ['7A', 10],
      ['8B', 9],
    ]);
    expect(bySeq.ranked[0].stats).toEqual({
      xp: 150,
      streak: 10,
      challenges: 2,
    });
    const byDes = await loadTurmaBoard({ ...base, category: 'challenges' });
    expect(byDes.ranked.map((t) => [t.name, t.value])).toEqual([
      ['8B', 5],
      ['7A', 2],
    ]);
  });

  it('empate divide a posição; desempate pelo nome', async () => {
    const { dataSource } = build({
      members: [member(1, 10, 'Zeta'), member(2, 11, 'Alfa')],
    });
    const board = await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [1, 2],
      seasonPoints: new Map([
        [1, 70],
        [2, 70],
      ]),
      scope: 'company',
      companyId: 3,
    });
    expect(board.ranked.map((t) => [t.name, t.position])).toEqual([
      ['Alfa', 1],
      ['Zeta', 1],
    ]);
  });

  it('turma com soma 0 fica fora da lista mas continua consultável', async () => {
    const { dataSource } = build({
      members: [member(4, 12, '9C'), member(1, 10, '7A')],
    });
    const board = await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [1, 4],
      seasonPoints: xp,
      scope: 'company',
      companyId: 3,
    });
    expect(board.ranked.map((t) => t.name)).toEqual(['7A']);
    const zero = viewerTurmaRow(board, 4);
    expect(zero?.name).toBe('9C');
    expect(zero?.position).toBeNull();
  });

  it('só considera alunos participantes e consulta tudo agregado, sem N+1', async () => {
    const { dataSource, query } = build({
      members: [member(1, 10, '7A')],
      streak: [[1, 3]],
      challenges: [[1, 1]],
    });
    await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: { from: '2026-10-01', to: '2026-11-01' },
      participantIds: [1, 2, 3],
      seasonPoints: xp,
      scope: 'company',
      companyId: 3,
    });
    expect(query).toHaveBeenCalledTimes(3);
    const sqls = query.mock.calls.map((c) => c[0]);
    expect(sqls.filter((s) => s.includes('FROM turma_aluno'))).toHaveLength(1);
    expect(sqls[0]).toContain('t.ativa = 1');
  });

  it('sem participantes não consulta o banco', async () => {
    const { dataSource, query } = build({ members: [] });
    const board = await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [],
      seasonPoints: xp,
      scope: 'company',
      companyId: 3,
    });
    expect(board.ranked).toEqual([]);
    expect(query).not.toHaveBeenCalled();
  });
});

describe('escopo da consulta de turmas', () => {
  const run = async (scope: 'company' | 'global', companyId: number | null) => {
    const { dataSource, query } = build({ members: [] });
    await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [1, 2],
      seasonPoints: new Map(),
      scope,
      companyId,
    });
    return query.mock.calls[0] as unknown as [string, unknown[]];
  };

  it('company: a turma tem de ser da escola pedida', async () => {
    const [sql, params] = await run('company', 3);
    expect(sql).toContain('t.empresa_id = ?');
    expect(sql).not.toContain('globalRankingEnabled');
    expect(params).toEqual([1, 2, 3]);
  });

  it('global: só turmas de escola elegível ao global (mesma definição dos alunos)', async () => {
    const [sql, params] = await run('global', 3);
    expect(sql).toContain("'$.globalRankingEnabled'");
    expect(sql).toContain("'$.rankingEnabled'");
    expect(sql).not.toContain('t.empresa_id = ?');
    expect(params).toEqual([1, 2]);
  });
});

describe('viewerTurmaRow', () => {
  it('escolhe a turma de melhor posição e ignora quem não está em turma', async () => {
    const { dataSource } = build({
      members: [member(1, 10, '7A'), member(1, 11, '8B'), member(2, 11, '8B')],
    });
    const board = await loadTurmaBoard({
      dataSource,
      category: 'xp',
      window: null,
      participantIds: [1, 2],
      seasonPoints: new Map([
        [1, 10],
        [2, 100],
      ]),
      scope: 'company',
      companyId: 3,
    });
    expect(viewerTurmaRow(board, 1)?.name).toBe('8B');
    expect(viewerTurmaRow(board, 99)).toBeNull();
  });
});

describe('toTurmaEntry', () => {
  const row = {
    id: 10,
    name: '7A',
    companyName: 'Escola Norte',
    studentCount: 2,
    value: 150,
    stats: { xp: 150, streak: 10, challenges: 2 },
    position: 1,
  };

  it('não expõe id interno nem dado de aluno; companyName só no global', () => {
    const company = toTurmaEntry(row, true, 'company');
    const global = toTurmaEntry(row, false, 'global');
    expect(company).toEqual({
      rankKey: turmaKey(10),
      position: 1,
      name: '7A',
      companyName: null,
      studentCount: 2,
      value: 150,
      stats: { xp: 150, streak: 10, challenges: 2 },
      mine: true,
    });
    expect(global.companyName).toBe('Escola Norte');
    expect(global.mine).toBe(false);
    for (const entry of [company, global]) {
      const keys = Object.keys(entry);
      for (const forbidden of [
        'id',
        'usuarioId',
        'look',
        'profileImageUrl',
        'level',
        'members',
      ])
        expect(keys).not.toContain(forbidden);
    }
  });
});
