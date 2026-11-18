import { BancoNotificacoesFake } from '../notification-banco.fake-spec';
import { NotificationService } from '../notification.service';
import { GestaoNotificationListener } from './gestao.listener';

type Consulta = [string, unknown[]];
type Resposta = (sql: string, parametros: unknown[]) => unknown;

const montar = (respostas: Resposta[]) => {
  const query = jest.fn((sql: string, parametros: unknown[]) => {
    for (const resposta of respostas) {
      const valor = resposta(sql, parametros);
      if (valor !== undefined) return Promise.resolve(valor);
    }
    return Promise.resolve([]);
  });
  const notifications = { notify: jest.fn().mockResolvedValue(1) };
  const listener = new GestaoNotificationListener(
    notifications as never,
    { query } as never,
  );
  return { listener, query, notifications };
};

const chamadas = (query: jest.Mock) =>
  query.mock.calls as unknown as Consulta[];
const total =
  (n: number | string): Resposta =>
  (sql) =>
    sql.includes('COUNT(*)') ? [{ total: n }] : undefined;
const usuarios =
  (ids: number[]): Resposta =>
  (sql) =>
    sql.includes('SELECT id FROM usuario')
      ? ids.map((id) => ({ id }))
      : undefined;

describe('GestaoNotificationListener: apelidos pendentes', () => {
  it('notifica só admins ativos da escola com resumo (reabre só se aumentar)', async () => {
    const { listener, query, notifications } = montar([
      total('3'),
      usuarios([10, 11]),
    ]);

    await listener.atualizarApelidosPendentes(5);

    const admins = chamadas(query).find(([sql]) =>
      sql.includes('SELECT id FROM usuario'),
    )!;
    expect(admins[1]).toEqual([5, 'admin']);
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        usuarioId: 10,
        type: 'gestao',
        message: '3 apelidos aguardando aprovação',
        link: '/admin/pessoas/apelidos',
        groupKey: 'apelidos-pendentes:5',
        mode: 'resumo',
      }),
      expect.objectContaining({
        usuarioId: 11,
        groupKey: 'apelidos-pendentes:5',
      }),
    ]);
  });

  it('usa o singular com um pedido', async () => {
    const { listener, notifications } = montar([total(1), usuarios([10])]);
    await listener.atualizarApelidosPendentes(5);
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({ message: '1 apelido aguardando aprovação' }),
    ]);
  });

  it('com zero pendentes marca o resumo como lido e não cria notificação', async () => {
    const { listener, query, notifications } = montar([
      total(0),
      usuarios([10, 11]),
    ]);

    await listener.atualizarApelidosPendentes(5);

    expect(notifications.notify).not.toHaveBeenCalled();
    const update = chamadas(query).find(([sql]) =>
      sql.startsWith('UPDATE notification'),
    )!;
    // Filtra pelos admins da escola (índice por group_key + usuario_id).
    expect(update[0]).toContain('usuario_id IN (?,?)');
    expect(update[1]).toEqual([
      'Nenhum apelido aguardando aprovação',
      'apelidos-pendentes:5',
      10,
      11,
    ]);
  });

  it('fluxo completo: 3 pendentes, admin lê, aprova 1 e continua lido; novo pedido reabre', async () => {
    const banco = new BancoNotificacoesFake();
    let pendentes = 3;
    const dataSource = {
      query: jest.fn((sql: string, parametros: unknown[]) => {
        if (sql.includes('COUNT(*)'))
          return Promise.resolve([{ total: pendentes }]);
        if (sql.includes('SELECT id FROM usuario'))
          return Promise.resolve([{ id: 10 }]);
        return banco.query(sql, parametros);
      }),
    };
    const emit = jest.fn();
    const servico = new NotificationService(
      { query: banco.query, save: banco.save, find: banco.find } as never,
      { emit } as never,
      {} as never,
    );
    const listener = new GestaoNotificationListener(
      servico,
      dataSource as never,
    );
    const chave = 'apelidos-pendentes:5';

    await listener.atualizarApelidosPendentes(5);
    expect(banco.achar(10, chave)).toMatchObject({
      message: '3 apelidos aguardando aprovação',
      readed: false,
    });
    banco.marcarLida(10, chave);
    emit.mockClear();

    pendentes = 2; // admin aprovou um
    await listener.atualizarApelidosPendentes(5);
    expect(banco.achar(10, chave)).toMatchObject({
      message: '2 apelidos aguardando aprovação',
      readed: true,
    });
    expect(emit).not.toHaveBeenCalled();

    pendentes = 3; // chegou um novo pedido
    await listener.atualizarApelidosPendentes(5);
    expect(banco.achar(10, chave)!.readed).toBe(false);
    expect(emit).toHaveBeenCalledTimes(1);

    banco.marcarLida(10, chave);
    emit.mockClear();
    pendentes = 0; // todos decididos
    await listener.atualizarApelidosPendentes(5);
    expect(banco.achar(10, chave)!.readed).toBe(true);
    pendentes = 1; // um pedido depois de zerar ainda reabre
    await listener.atualizarApelidosPendentes(5);
    expect(banco.achar(10, chave)).toMatchObject({
      message: '1 apelido aguardando aprovação',
      readed: false,
    });
    expect(emit).toHaveBeenCalledTimes(1);
  });

  it('falha no handler não propaga', async () => {
    const { listener, query } = montar([]);
    query.mockRejectedValue(new Error('banco'));
    await expect(
      listener.aoSolicitarApelido({ empresaId: 5 }),
    ).resolves.toBeUndefined();
  });
});

describe('GestaoNotificationListener: entrada na turma', () => {
  const turma: Resposta = (sql) =>
    sql.includes('FROM turma WHERE')
      ? [{ id: 9, empresa_id: 5, nome: '7A' }]
      : undefined;
  const entradas =
    (n: number): Resposta =>
    (sql) =>
      sql.includes('FROM turma_aluno') ? [{ total: n }] : undefined;
  const professores: Resposta = (sql) =>
    sql.includes('FROM turma_professor') ? [{ id: 20 }] : undefined;

  it('resume as entradas do dia para os professores da turma da mesma escola', async () => {
    const { listener, query, notifications } = montar([
      turma,
      entradas(4),
      professores,
    ]);

    await listener.resumirEntradasDaTurma(9, new Date('2026-11-18T15:00:00Z'));

    const prof = chamadas(query).find(([sql]) =>
      sql.includes('FROM turma_professor'),
    )!;
    expect(prof[1]).toEqual([9, 5, 'teacher']);
    const contagem = chamadas(query).find(([sql]) =>
      sql.includes('FROM turma_aluno'),
    )!;
    expect((contagem[1][1] as Date).toISOString()).toBe(
      '2026-11-18T03:00:00.000Z',
    );
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        usuarioId: 20,
        type: 'turma',
        message: '4 alunos entraram na turma 7A hoje',
        link: '/admin/turmas/9/alunos',
        groupKey: 'turma-entradas:9:2026-11-18',
        mode: 'replace',
      }),
    ]);
  });

  it('o dia do agrupamento segue São Paulo (madrugada UTC ainda é o dia anterior)', async () => {
    const { listener, notifications } = montar([
      turma,
      entradas(1),
      professores,
    ]);
    await listener.resumirEntradasDaTurma(9, new Date('2026-11-19T01:30:00Z'));
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        groupKey: 'turma-entradas:9:2026-11-18',
        message: '1 aluno entrou na turma 7A hoje',
      }),
    ]);
  });

  it('sem professores, sem entradas ou turma inexistente não notifica', async () => {
    const semProf = montar([turma, entradas(2)]);
    await semProf.listener.resumirEntradasDaTurma(9);
    expect(semProf.notifications.notify).not.toHaveBeenCalled();

    const semEntrada = montar([turma, entradas(0), professores]);
    await semEntrada.listener.resumirEntradasDaTurma(9);
    expect(semEntrada.notifications.notify).not.toHaveBeenCalled();

    const semTurma = montar([]);
    await semTurma.listener.resumirEntradasDaTurma(9);
    expect(semTurma.notifications.notify).not.toHaveBeenCalled();
  });
});
