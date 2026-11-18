import { BancoNotificacoesFake } from './notification-banco.fake-spec';
import { NotificationJobs } from './notification-jobs';
import { NotificationService } from './notification.service';

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
  const jobs = new NotificationJobs(notifications as never, { query } as never);
  return { jobs, query, notifications };
};

const chamadas = (query: jest.Mock) =>
  query.mock.calls as unknown as Consulta[];
const AGORA = new Date('2026-11-18T15:00:00Z');
const DIA = 24 * 60 * 60 * 1000;

describe('NotificationJobs.avisarFimDoTrial', () => {
  it('consulta as janelas de 7 e de 1 dia só para alunos ativos', async () => {
    const { jobs, query } = montar([]);
    await jobs.avisarFimDoTrial(AGORA);

    const selects = chamadas(query).filter(([sql]) =>
      sql.includes('trial_ends_at'),
    );
    expect(selects).toHaveLength(2);
    const [p7, p1] = selects.map(([, p]) => p);
    expect(p7[0]).toBe('user');
    expect((p7[1] as Date).getTime()).toBe(AGORA.getTime() + 6 * DIA);
    expect((p7[2] as Date).getTime()).toBe(AGORA.getTime() + 7 * DIA);
    expect((p1[1] as Date).getTime()).toBe(AGORA.getTime());
    expect((p1[2] as Date).getTime()).toBe(AGORA.getTime() + DIA);
    expect(selects[0][0]).toContain('active = 1');
  });

  it('grava aviso once por data de término, tipo aviso, link /inicio', async () => {
    const termino = new Date('2026-11-25T14:00:00Z');
    let primeira = true;
    const { jobs, notifications } = montar([
      (sql) => {
        if (!sql.includes('trial_ends_at')) return undefined;
        if (primeira) {
          primeira = false;
          return [{ id: 4, trial_ends_at: termino }];
        }
        return [];
      },
    ]);

    await jobs.avisarFimDoTrial(AGORA);

    expect(notifications.notify).toHaveBeenCalledTimes(1);
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        usuarioId: 4,
        type: 'aviso',
        link: '/inicio',
        groupKey: 'trial-7d:2026-11-25',
        mode: 'once',
      }),
    ]);
  });

  it('o aviso de 1 dia usa a chave trial-1d da data do prazo', async () => {
    const termino = new Date('2026-11-19T02:00:00Z');
    const { jobs, notifications } = montar([
      (sql, p) =>
        sql.includes('trial_ends_at') &&
        (p[1] as Date).getTime() === AGORA.getTime()
          ? [{ id: 9, trial_ends_at: termino }]
          : undefined,
    ]);
    await jobs.avisarFimDoTrial(AGORA);
    expect(notifications.notify).toHaveBeenCalledWith([
      expect.objectContaining({
        groupKey: 'trial-1d:2026-11-18',
        mode: 'once',
      }),
    ]);
  });
});

describe('NotificationJobs.avisarConvitesExpirados', () => {
  const porEscola: Resposta = (sql) =>
    sql.includes('FROM convite')
      ? [
          { empresa_id: 5, total: '2' },
          { empresa_id: 6, total: 1 },
        ]
      : undefined;
  const admins: Resposta = (sql, p) =>
    sql.includes('SELECT id FROM usuario')
      ? p[0] === 5
        ? [{ id: 50 }, { id: 51 }]
        : [{ id: 60 }]
      : undefined;

  it('janela do início do dia em São Paulo até agora e só convites vivos e não aceitos', async () => {
    const { jobs, query } = montar([]);
    await jobs.avisarConvitesExpirados(AGORA);
    const [sql, p] = chamadas(query)[0];
    expect(sql).toContain('revoked = 0');
    expect(sql).toContain('uses < max_uses');
    expect(sql).toContain('expires_at >= ?');
    expect((p[0] as Date).toISOString()).toBe('2026-11-18T03:00:00.000Z');
    expect(p[1]).toBe(AGORA);
  });

  it('cada escola avisa apenas os próprios admins, em resumo por dia', async () => {
    const { jobs, notifications } = montar([porEscola, admins]);

    await jobs.avisarConvitesExpirados(AGORA);

    expect(notifications.notify).toHaveBeenCalledTimes(2);
    expect(notifications.notify).toHaveBeenNthCalledWith(1, [
      expect.objectContaining({
        usuarioId: 50,
        type: 'gestao',
        message: '2 convites expiraram hoje sem ser aceitos',
        link: '/admin/pessoas/convites',
        groupKey: 'convites-expirados:5:2026-11-18',
        mode: 'resumo',
      }),
      expect.objectContaining({ usuarioId: 51 }),
    ]);
    expect(notifications.notify).toHaveBeenNthCalledWith(2, [
      expect.objectContaining({
        usuarioId: 60,
        message: '1 convite expirou hoje sem ser aceito',
        groupKey: 'convites-expirados:6:2026-11-18',
      }),
    ]);
  });

  describe('com o serviço de gravação real', () => {
    const montarReal = () => {
      const banco = new BancoNotificacoesFake();
      let total = 0;
      const emit = jest.fn();
      const repositorio = {
        query: jest.fn((sql: string, parametros: unknown[]) => {
          if (sql.includes('FROM convite'))
            return Promise.resolve(total ? [{ empresa_id: 5, total }] : []);
          if (sql.includes('SELECT id FROM usuario'))
            return Promise.resolve([{ id: 50 }]);
          return banco.query(sql, parametros);
        }),
        save: banco.save,
        find: banco.find,
      };
      const servico = new NotificationService(
        repositorio as never,
        { emit } as never,
        {} as never,
      );
      const jobs = new NotificationJobs(servico, repositorio as never);
      return {
        jobs,
        banco,
        emit,
        repositorio,
        definir: (n: number) => {
          total = n;
        },
      };
    };

    it('várias execuções no mesmo dia: lido continua lido; reabre só quando o total aumenta', async () => {
      const { jobs, banco, emit, definir } = montarReal();
      const chave = 'convites-expirados:5:2026-11-18';

      definir(2);
      await jobs.avisarConvitesExpirados(new Date('2026-11-18T13:00:00Z'));
      expect(banco.achar(50, chave)).toMatchObject({
        message: '2 convites expiraram hoje sem ser aceitos',
        readed: false,
      });
      banco.marcarLida(50, chave);
      emit.mockClear();

      // Mesma contagem em outra execução do dia: nada muda.
      await jobs.avisarConvitesExpirados(new Date('2026-11-18T14:00:00Z'));
      expect(banco.achar(50, chave)!.readed).toBe(true);
      expect(emit).not.toHaveBeenCalled();

      // Total diminui (convite aceito): texto muda em silêncio, segue lido.
      definir(1);
      await jobs.avisarConvitesExpirados(new Date('2026-11-18T15:00:00Z'));
      expect(banco.achar(50, chave)).toMatchObject({
        message: '1 convite expirou hoje sem ser aceito',
        readed: true,
      });
      expect(emit).not.toHaveBeenCalled();

      // Total aumenta: reabre e publica.
      definir(3);
      await jobs.avisarConvitesExpirados(new Date('2026-11-18T20:00:00Z'));
      expect(banco.achar(50, chave)).toMatchObject({
        message: '3 convites expiraram hoje sem ser aceitos',
        readed: false,
      });
      expect(emit).toHaveBeenCalledTimes(1);
    });

    it('atravessando a meia-noite de São Paulo conta o dia novo e usa outra chave', async () => {
      const { jobs, banco, repositorio, definir } = montarReal();

      definir(4);
      await jobs.avisarConvitesExpirados(new Date('2026-11-19T02:50:00Z')); // 23:50 de 18/11
      banco.marcarLida(50, 'convites-expirados:5:2026-11-18');

      definir(1);
      await jobs.avisarConvitesExpirados(new Date('2026-11-19T03:10:00Z')); // 00:10 de 19/11

      const consultas = (
        repositorio.query.mock.calls as unknown as Array<[string, unknown[]]>
      ).filter(([sql]) => sql.includes('FROM convite'));
      expect((consultas[0][1][0] as Date).toISOString()).toBe(
        '2026-11-18T03:00:00.000Z',
      );
      expect((consultas[1][1][0] as Date).toISOString()).toBe(
        '2026-11-19T03:00:00.000Z',
      );
      expect(banco.achar(50, 'convites-expirados:5:2026-11-18')!.readed).toBe(
        true,
      );
      expect(banco.achar(50, 'convites-expirados:5:2026-11-19')).toMatchObject({
        message: '1 convite expirou hoje sem ser aceito',
        readed: false,
      });
    });
  });

  it('falha em uma escola não impede as demais', async () => {
    const { jobs, notifications } = montar([porEscola, admins]);
    notifications.notify.mockRejectedValueOnce(new Error('x'));
    await jobs.avisarConvitesExpirados(AGORA);
    expect(notifications.notify).toHaveBeenCalledTimes(2);
  });
});

describe('NotificationJobs.jobs', () => {
  it('expõe os jobs de trial e de convites expirados', () => {
    const { jobs } = montar([]);
    expect(jobs.jobs.map((job) => job.nome)).toEqual([
      'trial-fim',
      'convites-expirados',
    ]);
  });
});
