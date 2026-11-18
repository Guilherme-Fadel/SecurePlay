import { BadRequestException } from '@nestjs/common';
import { BancoNotificacoesFake } from './notification-banco.fake-spec';
import { NotificationService } from './notification.service';
import { sanitizeNotificationLink } from './notification-types';

type Linha = Record<string, unknown>;

const montarComBanco = () => {
  const banco = new BancoNotificacoesFake();
  const repositorio = {
    query: jest.fn(banco.query),
    save: jest.fn(banco.save),
    find: jest.fn(banco.find),
  };
  const emit = jest.fn();
  const servico = new NotificationService(
    repositorio as never,
    { emit } as never,
    {} as never,
  );
  return { servico, repositorio, emit, banco };
};

const montar = () => {
  const gravadas: Linha[] = [];
  const repositorio = {
    save: jest.fn((linhas: Linha[]) =>
      Promise.resolve(
        linhas.map((linha) => {
          const salva = {
            id: gravadas.length + 1,
            created_at: new Date(),
            ...linha,
          };
          gravadas.push(salva);
          return salva;
        }),
      ),
    ),
    query: jest.fn<Promise<unknown>, [string, unknown[]]>(),
    find: jest.fn(() => Promise.resolve(gravadas)),
    findOne: jest.fn(),
    delete: jest.fn(),
  };
  const emit = jest.fn();
  const servico = new NotificationService(
    repositorio as never,
    { emit } as never,
    {} as never,
  );
  return { servico, repositorio, emit, gravadas };
};

describe('NotificationService.notify', () => {
  it('sem groupKey insere sempre, corta tamanhos e sanitiza o link', async () => {
    const { servico, repositorio, emit } = montar();

    const total = await servico.notify([
      {
        usuarioId: 1,
        type: 'aviso',
        title: 'T'.repeat(150),
        message: 'M'.repeat(400),
        link: 'https://malicioso.com/x',
      },
      {
        usuarioId: 2,
        type: 'turma',
        title: 'ok',
        message: 'ok',
        link: '/aprender/3-modulo',
      },
    ]);

    expect(total).toBe(2);
    const linhas = repositorio.save.mock.calls[0][0];
    expect((linhas[0].title as string).length).toBe(100);
    expect((linhas[0].message as string).length).toBe(250);
    expect(linhas[0].link).toBeNull();
    expect(linhas[1].link).toBe('/aprender/3-modulo');
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ usuario_id: 2, link: '/aprender/3-modulo' }),
    );
  });

  it('once grava quem não tem a chave e não reemite nem conta quem já tem', async () => {
    const { servico, emit, banco } = montarComBanco();
    const entrada = (usuarioId: number) => ({
      usuarioId,
      type: 'conquista' as const,
      title: 'a',
      message: 'b',
      groupKey: 'conquista:7',
    });

    expect(await servico.notify([entrada(1), entrada(2)])).toBe(2);
    expect(emit).toHaveBeenCalledTimes(2);
    emit.mockClear();

    banco.avancar();
    expect(await servico.notify([entrada(1), entrada(2), entrada(3)])).toBe(1);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ usuario_id: 3 }),
    );
    expect(banco.linhas).toHaveLength(3);
  });

  it('replace atualiza, zera readed, renova a data e emite todos', async () => {
    const { servico, emit, banco } = montarComBanco();
    const entrada = (message: string) => ({
      usuarioId: 1,
      type: 'turma' as const,
      title: 'novo',
      message,
      groupKey: 'turma:1:2026-11-18',
      mode: 'replace' as const,
    });
    await servico.notify([entrada('um')]);
    banco.marcarLida(1, 'turma:1:2026-11-18');
    const antes = banco.achar(1, 'turma:1:2026-11-18')!.created_at;
    banco.avancar();
    emit.mockClear();

    expect(await servico.notify([entrada('dois')])).toBe(1);

    const linha = banco.achar(1, 'turma:1:2026-11-18')!;
    expect(linha.message).toBe('dois');
    expect(linha.readed).toBe(false);
    expect(linha.created_at.getTime()).toBeGreaterThan(antes.getTime());
    expect(emit).toHaveBeenCalledWith(
      'notification.created',
      expect.objectContaining({ id: linha.id, message: 'dois' }),
    );
  });

  it('grava o lote agrupado em consultas multi-linha, não uma por item', async () => {
    const { servico, repositorio, banco } = montarComBanco();
    const entradas = Array.from({ length: 120 }, (_, i) => ({
      usuarioId: i + 1,
      type: 'ranking' as const,
      title: 't',
      message: 'm',
      groupKey: 'temporada:2026-10',
    }));

    expect(await servico.notify(entradas)).toBe(120);

    expect(banco.linhas).toHaveLength(120);
    // pré-consulta + INSERT IGNORE + SELECT dos IDs a publicar
    expect(repositorio.query).toHaveBeenCalledTimes(3);
    const insert = banco.consultas.find((sql) =>
      sql.startsWith('INSERT IGNORE'),
    )!;
    expect(insert.match(/\(\?, \?, \?, \?, \?, \?, 0\)/g)).toHaveLength(120);
  });

  it('grupos acima de 500 vão em lotes de 500 e todos são publicados', async () => {
    const { servico, repositorio, banco, emit } = montarComBanco();
    const entradas = Array.from({ length: 1201 }, (_, i) => ({
      usuarioId: i + 1,
      type: 'aviso' as const,
      title: 't',
      message: 'm',
      groupKey: 'g:1',
      mode: 'replace' as const,
    }));

    expect(await servico.notify(entradas)).toBe(1201);

    expect(banco.linhas).toHaveLength(1201);
    expect(emit).toHaveBeenCalledTimes(1201);
    const inserts = banco.consultas.filter((sql) =>
      sql.startsWith('INSERT INTO'),
    );
    expect(inserts).toHaveLength(3);
    expect(repositorio.query).toHaveBeenCalledTimes(6);
  });

  it('o mesmo usuário e chave repetidos no lote geram uma linha só', async () => {
    const { servico, banco } = montarComBanco();
    const item = {
      usuarioId: 1,
      type: 'aviso' as const,
      title: 't',
      message: 'm',
      groupKey: 'x:1',
    };
    expect(await servico.notify([item, item])).toBe(1);
    expect(banco.linhas).toHaveLength(1);
  });

  it('corta groupKey em 120 caracteres', async () => {
    const { servico, banco } = montarComBanco();

    await servico.notify([
      {
        usuarioId: 1,
        type: 'aviso',
        title: 'a',
        message: 'b',
        groupKey: 'k'.repeat(300),
      },
    ]);

    expect(banco.linhas[0].group_key).toHaveLength(120);
  });

  describe('resumo: só reabre quando a contagem aumenta', () => {
    const resumo = (total: number) => ({
      usuarioId: 10,
      type: 'gestao' as const,
      title: 'Apelidos pendentes',
      message: `${total} apelidos aguardando aprovação`,
      groupKey: 'apelidos-pendentes:5',
      mode: 'resumo' as const,
    });

    it('3 pendentes, lido, aprova 1 (2): continua lido e sem socket; novo pedido (3) reabre', async () => {
      const { servico, emit, banco } = montarComBanco();
      expect(await servico.notify([resumo(3)])).toBe(1);
      banco.marcarLida(10, 'apelidos-pendentes:5');
      emit.mockClear();
      banco.avancar();
      const criada = banco.achar(10, 'apelidos-pendentes:5')!.created_at;

      expect(await servico.notify([resumo(2)])).toBe(0);
      const depoisDeDiminuir = banco.achar(10, 'apelidos-pendentes:5')!;
      expect(depoisDeDiminuir.message).toBe('2 apelidos aguardando aprovação');
      expect(depoisDeDiminuir.readed).toBe(true);
      expect(depoisDeDiminuir.created_at).toEqual(criada);
      expect(emit).not.toHaveBeenCalled();

      banco.avancar();
      expect(await servico.notify([resumo(3)])).toBe(1);
      const reaberta = banco.achar(10, 'apelidos-pendentes:5')!;
      expect(reaberta.readed).toBe(false);
      expect(reaberta.created_at.getTime()).toBeGreaterThan(criada.getTime());
      expect(emit).toHaveBeenCalledTimes(1);
    });

    it('mesma contagem de novo não reabre nem emite', async () => {
      const { servico, emit, banco } = montarComBanco();
      await servico.notify([resumo(2)]);
      banco.marcarLida(10, 'apelidos-pendentes:5');
      emit.mockClear();

      expect(await servico.notify([resumo(2)])).toBe(0);
      expect(banco.achar(10, 'apelidos-pendentes:5')!.readed).toBe(true);
      expect(emit).not.toHaveBeenCalled();
    });
  });

  it('grava em lotes de 500', async () => {
    const { servico, repositorio } = montar();
    const entradas = Array.from({ length: 1201 }, (_, i) => ({
      usuarioId: i + 1,
      type: 'aviso' as const,
      title: 't',
      message: 'm',
    }));

    expect(await servico.notify(entradas)).toBe(1201);
    expect(repositorio.save).toHaveBeenCalledTimes(3);
  });
});

describe('NotificationService: apagar e listar', () => {
  it('recusa apagar aviso de segurança com menos de 30 dias', async () => {
    const { servico, repositorio } = montar();
    repositorio.findOne.mockResolvedValue({
      id: 1,
      usuario_id: 5,
      type: 'seguranca',
      created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    });

    await expect(servico.deleteNotification(1, 5)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(repositorio.delete).not.toHaveBeenCalled();
  });

  it('permite apagar segurança antiga e outros tipos recentes', async () => {
    const { servico, repositorio } = montar();
    repositorio.findOne.mockResolvedValueOnce({
      id: 1,
      usuario_id: 5,
      type: 'seguranca',
      created_at: new Date(Date.now() - 31 * 24 * 60 * 60 * 1000),
    });
    await servico.deleteNotification(1, 5);
    repositorio.findOne.mockResolvedValueOnce({
      id: 2,
      usuario_id: 5,
      type: 'aviso',
      created_at: new Date(),
    });
    await servico.deleteNotification(2, 5);
    expect(repositorio.delete).toHaveBeenCalledTimes(2);
  });

  it('limita a listagem do usuário às 50 mais recentes', async () => {
    const { servico, repositorio } = montar();
    repositorio.find.mockResolvedValue([]);

    await servico.getNotificationByUserId(5);

    expect(repositorio.find).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 50,
        order: { created_at: 'DESC', id: 'DESC' },
      }),
    );
  });
});

describe('sanitizeNotificationLink', () => {
  it.each([
    ['/inicio', '/inicio'],
    ['/aprender/3-seguranca/9-aula', '/aprender/3-seguranca/9-aula'],
    ['/conquistas?aba=colecionaveis', '/conquistas?aba=colecionaveis'],
    ['/admin/turmas/4/jornada', '/admin/turmas/4/jornada'],
  ])('aceita %s', (entrada, saida) => {
    expect(sanitizeNotificationLink(entrada)).toBe(saida);
  });

  it.each([
    'https://exemplo.com',
    '//exemplo.com',
    '/\\exemplo.com',
    'javascript:alert(1)',
    '/inicio/../admin',
    '/outra-rota',
    '/inicioX',
    'inicio',
    '/aprender/<script>',
    '/aprender/' + 'a'.repeat(200),
    '',
    null,
    undefined,
  ])('rejeita %p', (entrada) => {
    expect(sanitizeNotificationLink(entrada as string | null)).toBeNull();
  });
});
