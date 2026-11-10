import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DataSource } from 'typeorm';
import {
  Massa,
  falha,
  semear,
  turmaFixture,
  turmaIntegration,
} from '../../test/fixtures/turma-fixture';
import { AdminAuditService } from '../admin/admin-audit.service';
import { AdminAuditEvent } from '../admin/entities/admin-audit-event.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAcessoService } from './turma-acesso.service';
import { TurmaService } from './turma.service';
import { JornadaEdicaoService } from './jornada-edicao.service';

turmaIntegration('JornadaEdicaoService em MySQL descartável', () => {
  let source: DataSource;
  let massa: Massa;
  let turmas: TurmaService;
  let edicao: JornadaEdicaoService;
  const events = { emit: jest.fn() };

  beforeAll(async () => {
    ({ source } = await turmaFixture());
    massa = await semear(source);
    const audit = new AdminAuditService(source);
    turmas = new TurmaService(source, audit);
    edicao = new JornadaEdicaoService(
      source,
      new TurmaAcessoService(source),
      audit,
      events as unknown as EventEmitter2,
    );
  }, 60_000);

  afterAll(async () => {
    await source?.destroy();
  });

  beforeEach(() => events.emit.mockClear());

  async function turmaComProfessor(nome: string) {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome,
      ano_letivo: 2026,
    });
    await turmas.vincularProfessor(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      massa.profA.id,
    );
    return turma;
  }
  const [a11, a12, a21] = [0, 1, 2].map((i) => () => massa.aulas[i].id);
  const futuro = (dias: number) => new Date(Date.now() + dias * 86400000);
  const estados = (
    jornada: Awaited<ReturnType<JornadaEdicaoService['obter']>>,
  ) =>
    jornada.modulos.flatMap((m) => m.aulas.map((a) => [a.aula_id, a.estado]));

  it('professor vinculado vê a jornada; não vinculado recebe 404', async () => {
    const turma = await turmaComProfessor('Ver jornada');
    const jornada = await edicao.obter(massa.profA.id, turma.id);
    expect(jornada.turma).toMatchObject({ id: turma.id, ativa: true });
    expect(jornada.modulos.map((m) => [m.modulo_id, m.posicao])).toEqual([
      [massa.m1.id, 1],
      [massa.m2.id, 2],
    ]);
    expect(estados(jornada)).toEqual([
      [a11(), 'fechada'],
      [a12(), 'fechada'],
      [a21(), 'fechada'],
    ]);
    expect(jornada.resumo).toEqual({ aulasAbertas: 0, proximaAbertura: null });
    expect(jornada.catalogo).toEqual([]);
    await falha(
      edicao.obter(massa.profB.id, turma.id),
      NotFoundException,
      'Turma não encontrada',
    );
  });

  it('abrir agora abre as anteriores, audita e avisa os alunos da turma', async () => {
    const turma = await turmaComProfessor('Abrir agora');
    await turmas.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      massa.alunoA1.id,
    ]);
    const resultado = await edicao.definirAbertura(
      massa.profA.id,
      turma.id,
      a12(),
      { modo: 'agora' },
    );
    expect(resultado.abertasEmCascata).toEqual([a11(), a12()]);
    expect(estados(resultado)).toEqual([
      [a11(), 'aberta'],
      [a12(), 'aberta'],
      [a21(), 'fechada'],
    ]);
    expect(resultado.resumo.aulasAbertas).toBe(2);
    const evento = await source
      .getRepository(AdminAuditEvent)
      .findOneByOrFail({ alvo_id: turma.id, acao: 'turma.aula_aberta' });
    expect(evento.detalhes).toMatchObject({
      aula_id: a12(),
      cascata: [a11(), a12()],
    });
    expect(events.emit).toHaveBeenCalledTimes(1);
    expect(events.emit).toHaveBeenCalledWith('turma.jornada-atualizada', {
      turmaId: turma.id,
      usuarioIds: [massa.alunoA1.id],
      aulasAbertas: [
        { id: a11(), titulo: 'Senhas fortes' },
        { id: a12(), titulo: 'Frase-senha' },
      ],
    });
    events.emit.mockClear();
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a12(), {
        modo: 'agora',
      }),
      ConflictException,
      'Esta aula já está aberta',
    );
    expect(events.emit).not.toHaveBeenCalled();
  });

  it('agenda, altera e cancela abertura futura', async () => {
    const turma = await turmaComProfessor('Agendar');
    await edicao.definirAbertura(massa.profA.id, turma.id, a12(), {
      modo: 'agora',
    });
    const em3 = futuro(3);
    const agendada = await edicao.definirAbertura(
      massa.profA.id,
      turma.id,
      a21(),
      { modo: 'agendar', abre_em: em3.toISOString() },
    );
    expect(estados(agendada).at(-1)).toEqual([a21(), 'agendada']);
    expect(agendada.resumo.proximaAbertura).toEqual({
      aula_id: a21(),
      titulo: 'Links suspeitos',
      abre_em: new Date(Math.floor(em3.getTime() / 1000) * 1000).toISOString(),
    });
    await edicao.definirAbertura(massa.profA.id, turma.id, a21(), {
      modo: 'agendar',
      abre_em: futuro(5).toISOString(),
    });
    const cancelada = await edicao.cancelarAbertura(
      massa.profA.id,
      turma.id,
      a21(),
    );
    expect(estados(cancelada).at(-1)).toEqual([a21(), 'fechada']);
    const acoes = (
      await source
        .getRepository(AdminAuditEvent)
        .find({ where: { alvo_id: turma.id }, order: { id: 'ASC' } })
    ).map((e) => e.acao);
    expect(acoes.slice(-3)).toEqual([
      'turma.aula_agendada',
      'turma.agendamento_alterado',
      'turma.agendamento_cancelado',
    ]);
    await falha(
      edicao.cancelarAbertura(massa.profA.id, turma.id, a12()),
      ConflictException,
      'Esta aula já abriu',
    );
  });

  it('aplica as regras de ordem do agendamento', async () => {
    const turma = await turmaComProfessor('Regras');
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a12(), {
        modo: 'agendar',
        abre_em: futuro(2).toISOString(),
      }),
      BadRequestException,
      'Abra ou agende a aula anterior primeiro',
    );
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a11(), {
        modo: 'agendar',
        abre_em: new Date(Date.now() - 60000).toISOString(),
      }),
      BadRequestException,
      'Use abrir agora',
    );
    await source.getRepository(TurmaAulaAbertura).save({
      turma_id: turma.id,
      aula_id: a11(),
      abre_em: new Date(Date.now() - 3600000),
      definido_por_id: massa.adminA.id,
    });
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a11(), {
        modo: 'agendar',
        abre_em: futuro(2).toISOString(),
      }),
      ConflictException,
      'Esta aula já abriu',
    );
  });

  it('aula inativa ou fora da jornada responde 404', async () => {
    const turma = await turmaComProfessor('Fora');
    await edicao.salvarModulos(massa.profA.id, turma.id, [massa.m1.id]);
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a21(), {
        modo: 'agora',
      }),
      NotFoundException,
      'Aula não encontrada nesta jornada',
    );
  });

  it('salvar a ordem preserva módulo desativado temporariamente', async () => {
    const turma = await turmaComProfessor('Módulo pausado');
    await source.query('UPDATE modulo SET active = 0 WHERE id = ?', [
      massa.m2.id,
    ]);
    try {
      const salva = await edicao.salvarModulos(massa.profA.id, turma.id, [
        massa.m1.id,
      ]);
      expect(salva.modulos.map((m) => m.modulo_id)).toEqual([massa.m1.id]);
    } finally {
      await source.query('UPDATE modulo SET active = 1 WHERE id = ?', [
        massa.m2.id,
      ]);
    }
    const reativada = await edicao.obter(massa.profA.id, turma.id);
    expect(reativada.modulos.map((m) => m.modulo_id)).toEqual([
      massa.m1.id,
      massa.m2.id,
    ]);
  });

  it('salva módulos validando o catálogo e preserva aberturas de módulos retirados', async () => {
    const turma = await turmaComProfessor('Módulos');
    await falha(
      edicao.salvarModulos(massa.profA.id, turma.id, [
        massa.m1.id,
        massa.m1.id,
      ]),
      BadRequestException,
      'Módulos repetidos',
    );
    await falha(
      edicao.salvarModulos(massa.profA.id, turma.id, [massa.inativo.id]),
      BadRequestException,
      'Selecione módulos ativos do catálogo',
    );
    await edicao.definirAbertura(massa.profA.id, turma.id, a11(), {
      modo: 'agora',
    });
    const salva = await edicao.salvarModulos(massa.profA.id, turma.id, [
      massa.m2.id,
    ]);
    expect(salva.modulos.map((m) => m.modulo_id)).toEqual([massa.m2.id]);
    expect(salva.catalogo).toEqual([
      { modulo_id: massa.m1.id, titulo: 'Senhas' },
    ]);
    expect(
      await source
        .getRepository(TurmaAulaAbertura)
        .count({ where: { turma_id: turma.id, aula_id: a11() } }),
    ).toBe(1);
    const posicoes = await source
      .getRepository(TurmaModulo)
      .find({ where: { turma_id: turma.id } });
    expect(posicoes).toEqual([
      { turma_id: turma.id, modulo_id: massa.m2.id, posicao: 1 },
    ]);
    const vazia = await edicao.salvarModulos(massa.profA.id, turma.id, []);
    expect(vazia.modulos).toEqual([]);
  });

  it('turma arquivada congela a jornada mas continua legível', async () => {
    const turma = await turmaComProfessor('Congelada');
    await turmas.arquivar(massa.adminA.id, massa.escolaA.id, turma.id);
    await expect(edicao.obter(massa.profA.id, turma.id)).resolves.toMatchObject(
      { turma: { ativa: false } },
    );
    await falha(
      edicao.salvarModulos(massa.profA.id, turma.id, [massa.m1.id]),
      ConflictException,
      'Turma arquivada',
    );
    await falha(
      edicao.definirAbertura(massa.profA.id, turma.id, a11(), {
        modo: 'agora',
      }),
      ConflictException,
      'Turma arquivada',
    );
    await falha(
      edicao.cancelarAbertura(massa.profA.id, turma.id, a11()),
      ConflictException,
      'Turma arquivada',
    );
  });

  it('lista as turmas do professor e recusa a plataforma', async () => {
    const minha = await turmaComProfessor('Minha');
    const outra = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Outra',
      ano_letivo: 2026,
    });
    const ids = (await edicao.minhas(massa.profA.id)).map((t) => t.id);
    expect(ids).toContain(minha.id);
    expect(ids).not.toContain(outra.id);
    expect((await edicao.minhas(massa.adminA.id)).map((t) => t.id)).toEqual(
      expect.arrayContaining([minha.id, outra.id]),
    );
    const plataforma = await source.getRepository('Usuario').save({
      name: 'Plataforma',
      role: 'platform_admin',
      password: 'x',
      active: true,
      email: `p${Date.now()}@fixture.test`,
    });
    await falha(
      edicao.minhas((plataforma as { id: number }).id),
      BadRequestException,
      'Use as rotas da plataforma',
    );
  });

  it('lista alunos da turma sem dados de cadastro', async () => {
    const turma = await turmaComProfessor('Alunos');
    await turmas.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      massa.alunoA2.id,
    ]);
    const lista = await edicao.alunosDaTurma(massa.profA.id, turma.id, {
      page: 1,
      pageSize: 25,
    });
    expect(lista.items).toEqual([
      {
        id: massa.alunoA2.id,
        name: 'Aluno A2',
        nickname: null,
        entrou_em: expect.any(String) as string,
      },
    ]);
    expect(Object.keys(lista.items[0]).sort()).toEqual([
      'entrou_em',
      'id',
      'name',
      'nickname',
    ]);
  });
});
