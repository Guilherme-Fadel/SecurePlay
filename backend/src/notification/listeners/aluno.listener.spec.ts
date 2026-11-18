import { AlunoNotificationListener } from './aluno.listener';
import { NotificationInput } from '../notification.service';

function montar(
  opcoes: { ativos?: number[]; paginasModulo?: number[][] } = {},
) {
  const notify = jest.fn().mockResolvedValue(0);
  const paginas = [...(opcoes.paginasModulo ?? [])];
  const query = jest.fn((sql: string, params: unknown[]) => {
    if (sql.includes('FROM modulo')) return Promise.resolve([{ id: 3 }]);
    if (sql.includes('FROM turma_aluno'))
      return Promise.resolve((paginas.shift() ?? []).map((id) => ({ id })));
    // Filtro de alunos ativos: devolve os pedidos que estão na lista de ativos.
    const ids = (params as number[]).filter((id) =>
      (opcoes.ativos ?? [7, 8, 9]).includes(id),
    );
    return Promise.resolve(ids.map((id) => ({ id })));
  });
  const listener = new AlunoNotificationListener(
    { notify } as never,
    { query } as never,
  );
  const enviados = (): NotificationInput[] =>
    (notify.mock.calls as Array<[NotificationInput[]]>).flatMap(
      (chamada) => chamada[0],
    );
  return { listener, notify, query, enviados };
}

describe('AlunoNotificationListener', () => {
  it('conquista: tipo conquista, uma vez por conquista, link para /conquistas', async () => {
    const { listener, enviados } = montar();

    await listener.aoDesbloquearConquista({
      usuarioId: 7,
      conquistaId: 11,
      titulo: 'Nova patente',
    });

    expect(enviados()).toEqual([
      expect.objectContaining({
        usuarioId: 7,
        type: 'conquista',
        groupKey: 'conquista:11',
        mode: 'once',
        link: '/conquistas',
      }),
    ]);
    expect(enviados()[0].message).toContain('Nova patente');
  });

  it('nível: menciona as Chaves Digitais e agrupa por nível', async () => {
    const { listener, enviados } = montar();

    await listener.aoSubirDeNivel({ usuarioId: 7, nivel: 5, prestigio: 2 });

    expect(enviados()[0]).toMatchObject({
      type: 'progresso',
      groupKey: 'nivel:5',
      mode: 'once',
      link: '/conquistas',
    });
    expect(enviados()[0].message).toContain('nível 5');
    expect(enviados()[0].message).toContain('2 Chaves Digitais');
  });

  it('temporada: posição e pontos do próprio aluno, em lote, só para alunos ativos', async () => {
    const posicoes = Array.from({ length: 1200 }, (_, indice) => ({
      usuarioId: indice + 1,
      posicao: indice + 1,
      pontos: 5000 - indice,
    }));
    const ativos = posicoes
      .map((item) => item.usuarioId)
      .filter((id) => id !== 10);
    const { listener, notify, enviados } = montar({ ativos });

    await listener.aoFecharTemporada({
      seasonId: '2026-09',
      rotulo: 'Temporada 1',
      posicoes,
    });

    expect(notify).toHaveBeenCalledTimes(1);
    expect(enviados()).toHaveLength(1199);
    expect(enviados().some((item) => item.usuarioId === 10)).toBe(false);
    const terceiro = enviados().find((item) => item.usuarioId === 3)!;
    expect(terceiro).toMatchObject({
      type: 'ranking',
      groupKey: 'temporada:2026-09',
      mode: 'once',
      link: '/ranking',
    });
    expect(terceiro.message).toContain('3º lugar');
    expect(terceiro.message).toContain('4998 pontos');
    // Nada de nomes ou dados de colegas: a mensagem só cita o próprio resultado.
    expect(terceiro.message).not.toMatch(/colega/i);
  });

  it('aula aberta: uma notificação por aluno, com a chave da maior aula aberta', async () => {
    const { listener, enviados } = montar({ ativos: [7, 8] });

    await listener.aoAbrirAula({
      turmaId: 4,
      usuarioIds: [7, 8, 99],
      aulasAbertas: [
        { id: 21, titulo: 'Senhas fortes' },
        { id: 22, titulo: 'Golpes' },
      ],
    });

    expect(
      enviados().map((item) => `${item.usuarioId}:${item.groupKey}`),
    ).toEqual(['7:aula-aberta:4:22', '8:aula-aberta:4:22']);
    expect(enviados()[0]).toMatchObject({
      type: 'turma',
      mode: 'once',
      link: '/aprender',
      title: 'Aulas liberadas!',
    });
    expect(enviados()[0].message).toContain('e +1 aula.');
  });

  it('aula aberta em cascata: 6 aulas geram 1 notificação por aluno', async () => {
    const { listener, enviados } = montar({ ativos: [7, 8, 9] });

    await listener.aoAbrirAula({
      turmaId: 4,
      usuarioIds: [7, 8, 9],
      aulasAbertas: [31, 32, 33, 34, 35, 36].map((id) => ({
        id,
        titulo: `Aula ${id}`,
      })),
    });

    expect(enviados()).toHaveLength(3);
    expect(new Set(enviados().map((item) => item.usuarioId)).size).toBe(3);
    expect(enviados()[0].groupKey).toBe('aula-aberta:4:36');
    expect(enviados()[0].message).toContain('"Aula 31" e +5 aulas');
  });

  it('aula aberta: uma aula só mantém o texto simples', async () => {
    const { listener, enviados } = montar({ ativos: [7] });
    await listener.aoAbrirAula({
      turmaId: 4,
      usuarioIds: [7],
      aulasAbertas: [{ id: 21, titulo: 'Senhas fortes' }],
    });
    expect(enviados()[0]).toMatchObject({
      title: 'Aula liberada!',
      groupKey: 'aula-aberta:4:21',
      message: 'Seu professor abriu a aula "Senhas fortes". Bora aprender?',
    });
  });

  it('aula aberta: sem aulas abertas não grava nada', async () => {
    const { listener, notify } = montar();

    await listener.aoAbrirAula({
      turmaId: 4,
      usuarioIds: [7],
      aulasAbertas: [],
    });

    expect(notify).not.toHaveBeenCalled();
  });

  it('apelido recusado: texto acolhedor, modo replace e link para o perfil', async () => {
    const { listener, enviados } = montar();

    await listener.aoDecidirApelido({
      usuarioId: 7,
      aprovado: false,
      apelido: 'Estrela',
    });

    expect(enviados()[0]).toMatchObject({
      type: 'progresso',
      groupKey: 'apelido:7:Estrela',
      mode: 'replace',
      link: '/perfil',
    });
    expect(enviados()[0].message).toContain(
      'Escolha outro apelido no seu perfil',
    );
  });

  it('apelido aprovado: avisa com o apelido aprovado', async () => {
    const { listener, enviados } = montar();

    await listener.aoDecidirApelido({
      usuarioId: 7,
      aprovado: true,
      apelido: 'Estrela',
    });

    expect(enviados()[0].title).toBe('Apelido aprovado!');
    expect(enviados()[0].message).toContain('Estrela');
  });

  it('módulo publicado: notifica alunos elegíveis em páginas, uma vez por módulo', async () => {
    const primeira = Array.from({ length: 2000 }, (_, i) => i + 1);
    const { listener, enviados, query } = montar({
      paginasModulo: [primeira, [2001, 2002]],
    });

    await listener.aoPublicarModulo({ moduloId: 3, titulo: 'Privacidade' });

    expect(enviados()).toHaveLength(2002);
    expect(enviados()[0]).toMatchObject({
      type: 'progresso',
      groupKey: 'modulo:3',
      mode: 'once',
      link: '/aprender',
    });
    // Regra de visibilidade na própria consulta: aluno ativo sem turma ou com o módulo na turma.
    const sqlAlunos = query.mock.calls
      .map((chamada) => chamada[0])
      .find((sql) => sql.includes('turma_modulo'))!;
    expect(sqlAlunos).toContain("u.role = 'user'");
    expect(sqlAlunos).toContain('u.active = 1');
    expect(sqlAlunos).toContain('NOT EXISTS');
  });

  it('módulo publicado: módulo que deixou de estar ativo não notifica ninguém', async () => {
    const { listener, notify, query } = montar();
    query.mockImplementation((sql: string) =>
      Promise.resolve(sql.includes('FROM modulo') ? [] : [{ id: 1 }]),
    );

    await listener.aoPublicarModulo({ moduloId: 3, titulo: 'Privacidade' });

    expect(notify).not.toHaveBeenCalled();
  });

  it('módulo sem aula ativa não é anunciado; a primeira aula avisa e a segunda não repete', async () => {
    let aulasAtivas = 0;
    let anunciado = false;
    const { listener, notify, query } = montar();
    query.mockImplementation((sql: string, params: unknown[]) => {
      if (sql.includes('FROM modulo')) {
        // A regra mora na consulta: só devolve o módulo ativo com aula ativa.
        expect(sql).toContain('a.active = 1');
        return Promise.resolve(aulasAtivas > 0 ? [{ id: 3 }] : []);
      }
      if (sql.includes('FROM notification'))
        return Promise.resolve(anunciado ? [{ id: 1 }] : []);
      if (sql.includes('FROM turma_aluno'))
        return Promise.resolve(params[0] === 0 ? [{ id: 7 }] : []);
      return Promise.resolve([]);
    });
    notify.mockImplementation(() => {
      anunciado = true;
      return Promise.resolve(1);
    });
    const evento = { moduloId: 3, titulo: 'Privacidade' };

    await listener.aoPublicarModulo(evento); // módulo criado sem aulas
    expect(notify).not.toHaveBeenCalled();

    aulasAtivas = 1; // primeira aula ativa
    await listener.aoPublicarModulo(evento);
    expect(notify).toHaveBeenCalledTimes(1);

    aulasAtivas = 2; // segunda aula
    await listener.aoPublicarModulo(evento);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it('usuário que não é aluno ativo não recebe nada', async () => {
    const { listener, notify } = montar({ ativos: [] });

    await listener.aoDesbloquearConquista({
      usuarioId: 1,
      conquistaId: 2,
      titulo: 'X',
    });
    await listener.aoSubirDeNivel({ usuarioId: 1, nivel: 3 });
    await listener.aoDecidirApelido({
      usuarioId: 1,
      aprovado: true,
      apelido: 'A',
    });

    expect(notify).not.toHaveBeenCalled();
  });

  it('falha ao gravar nunca propaga para a origem', async () => {
    const { listener, notify } = montar();
    notify.mockRejectedValue(new Error('banco fora'));

    await expect(
      listener.aoDesbloquearConquista({
        usuarioId: 7,
        conquistaId: 1,
        titulo: 'X',
      }),
    ).resolves.toBeUndefined();
    await expect(
      listener.aoPublicarModulo({ moduloId: 3, titulo: 'Y' }),
    ).resolves.toBeUndefined();
  });

  it('respeita os limites do sino: título até 100 e mensagem até 250', async () => {
    const { listener, enviados } = montar();

    await listener.aoDesbloquearConquista({
      usuarioId: 7,
      conquistaId: 1,
      titulo: 'T'.repeat(500),
    });

    expect(enviados()[0].title.length).toBeLessThanOrEqual(100);
    expect(enviados()[0].message.length).toBeLessThanOrEqual(250);
  });
});
