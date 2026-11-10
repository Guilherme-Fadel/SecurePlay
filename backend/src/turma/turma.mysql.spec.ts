import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { DataSource } from 'typeorm';
import {
  Massa,
  falha,
  semear,
  turmaFixture,
  turmaIntegration,
} from '../../test/fixtures/turma-fixture';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Convite } from '../admin/entities/convite.entity';
import { AdminAuditEvent } from '../admin/entities/admin-audit-event.entity';
import { AdminAuditService } from '../admin/admin-audit.service';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { ConviteTurma } from './entities/convite-turma.entity';
import { TurmaService } from './turma.service';

turmaIntegration('TurmaService em MySQL descartável', () => {
  let source: DataSource;
  let service: TurmaService;
  let massa: Massa;

  beforeAll(async () => {
    ({ source } = await turmaFixture());
    massa = await semear(source);
    service = new TurmaService(source, new AdminAuditService(source));
  }, 60_000);

  afterAll(async () => {
    await source?.destroy();
  });

  const acoes = async (turmaId: number) =>
    (
      await source.getRepository(AdminAuditEvent).find({
        where: { alvo_tipo: 'turma', alvo_id: turmaId },
        order: { id: 'ASC' },
      })
    ).map((e) => e.acao);

  it('cria a turma com os módulos ativos do catálogo, sem aberturas, e audita', async () => {
    const turma = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: '  5º A  ',
      ano_letivo: 2026,
    });
    expect(turma).toMatchObject({
      nome: '5º A',
      ano_letivo: 2026,
      ativa: true,
      professores: 0,
      alunos: 0,
      proxima_abertura: null,
    });
    const modulos = await source
      .getRepository(TurmaModulo)
      .find({ where: { turma_id: turma.id }, order: { posicao: 'ASC' } });
    expect(modulos.map((m) => [m.modulo_id, m.posicao])).toEqual([
      [massa.m1.id, 1],
      [massa.m2.id, 2],
    ]);
    expect(
      await source
        .getRepository(TurmaAulaAbertura)
        .count({ where: { turma_id: turma.id } }),
    ).toBe(0);
    expect(await acoes(turma.id)).toEqual(['turma.criada']);
  });

  it('recusa nome repetido no mesmo ano e aceita em outro ano', async () => {
    await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: '6º B',
      ano_letivo: 2026,
    });
    await falha(
      service.criar(massa.adminA.id, massa.escolaA.id, {
        nome: '6º B',
        ano_letivo: 2026,
      }),
      ConflictException,
      'Já existe uma turma com este nome neste ano',
    );
    await expect(
      service.criar(massa.adminA.id, massa.escolaA.id, {
        nome: '6º B',
        ano_letivo: 2027,
      }),
    ).resolves.toMatchObject({ ano_letivo: 2027 });
  });

  it('recusa nome vazio depois de aparar', async () => {
    await falha(
      service.criar(massa.adminA.id, massa.escolaA.id, {
        nome: '   ',
        ano_letivo: 2026,
      }),
      BadRequestException,
      'Informe o nome da turma',
    );
  });

  it('só vincula professor ativo da mesma escola e é idempotente', async () => {
    const turma = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Prof',
      ano_letivo: 2026,
    });
    await falha(
      service.vincularProfessor(
        massa.adminA.id,
        massa.escolaA.id,
        turma.id,
        massa.profB.id,
      ),
      BadRequestException,
      'Selecione um professor ativo desta escola',
    );
    await falha(
      service.vincularProfessor(
        massa.adminA.id,
        massa.escolaA.id,
        turma.id,
        massa.alunoA1.id,
      ),
      BadRequestException,
      'Selecione um professor ativo desta escola',
    );
    await service.vincularProfessor(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      massa.profA.id,
    );
    await service.vincularProfessor(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      massa.profA.id,
    );
    expect(await service.listarProfessores(massa.escolaA.id, turma.id)).toEqual(
      [{ id: massa.profA.id, name: 'Prof A', email: massa.profA.email }],
    );
    await service.desvincularProfessor(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      massa.profA.id,
    );
    await falha(
      service.desvincularProfessor(
        massa.adminA.id,
        massa.escolaA.id,
        turma.id,
        massa.profA.id,
      ),
      NotFoundException,
      'Professor não vinculado a esta turma',
    );
    expect(await acoes(turma.id)).toEqual([
      'turma.criada',
      'turma.professor_vinculado',
      'turma.professor_desvinculado',
    ]);
  });

  it('adiciona e move alunos da escola, um por turma', async () => {
    const t1 = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Alunos 1',
      ano_letivo: 2026,
    });
    const t2 = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Alunos 2',
      ano_letivo: 2026,
    });
    await falha(
      service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, t1.id, [
        massa.alunoA1.id,
        massa.alunoB1.id,
      ]),
      BadRequestException,
      'Selecione apenas alunos desta escola',
    );
    await falha(
      service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, t1.id, [
        massa.profA.id,
      ]),
      BadRequestException,
      'Selecione apenas alunos desta escola',
    );
    await expect(
      service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, t1.id, [
        massa.alunoA1.id,
        massa.alunoA2.id,
      ]),
    ).resolves.toEqual({ adicionados: 2, movidos: 0 });
    const antes = await source
      .getRepository(TurmaAluno)
      .findOneByOrFail({ usuario_id: massa.alunoA1.id });
    await new Promise((resolve) => setTimeout(resolve, 5));
    await expect(
      service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, t2.id, [
        massa.alunoA1.id,
      ]),
    ).resolves.toEqual({ adicionados: 0, movidos: 1 });
    const depois = await source
      .getRepository(TurmaAluno)
      .findOneByOrFail({ usuario_id: massa.alunoA1.id });
    expect(depois.turma_id).toBe(t2.id);
    expect(depois.entrou_em.getTime()).toBeGreaterThan(
      antes.entrou_em.getTime(),
    );
    const lista = await service.listarAlunos(massa.escolaA.id, t1.id, {
      page: 1,
      pageSize: 25,
    });
    expect(lista).toMatchObject({
      total: 1,
      items: [{ id: massa.alunoA2.id, name: 'Aluno A2', nickname: null }],
    });
    expect(lista.items[0]).not.toHaveProperty('email');
    await service.removerAluno(
      massa.adminA.id,
      massa.escolaA.id,
      t2.id,
      massa.alunoA1.id,
    );
    expect(
      await source
        .getRepository(TurmaAluno)
        .count({ where: { usuario_id: massa.alunoA1.id } }),
    ).toBe(0);
    await falha(
      service.removerAluno(
        massa.adminA.id,
        massa.escolaA.id,
        t2.id,
        massa.alunoA1.id,
      ),
      NotFoundException,
      'Aluno não está nesta turma',
    );
  });

  it('arquivar revoga convites pendentes, congela escritas e permite tirar alunos', async () => {
    const turma = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Arquivo',
      ano_letivo: 2026,
    });
    const novo = await source.getRepository(Usuario).save({
      name: 'Aluno Novo',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'hash-fixture',
      active: true,
    });
    await service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      novo.id,
    ]);
    const convite = await source.getRepository(Convite).save({
      token_hash: `hash-${Date.now()}`,
      empresa_id: massa.escolaA.id,
      criado_por_id: massa.adminA.id,
      expires_at: new Date(Date.now() + 86400000),
      role: Role.USER,
      registration_mode: 'school_student',
    });
    await source
      .getRepository(ConviteTurma)
      .save({ convite_id: convite.id, turma_id: turma.id });
    await expect(
      service.arquivar(massa.adminA.id, massa.escolaA.id, turma.id),
    ).resolves.toMatchObject({ ativa: false });
    expect(
      (await source.getRepository(Convite).findOneByOrFail({ id: convite.id }))
        .revoked,
    ).toBe(true);
    await falha(
      service.atualizar(massa.adminA.id, massa.escolaA.id, turma.id, {
        nome: 'X',
        ano_letivo: 2026,
      }),
      ConflictException,
      'Turma arquivada',
    );
    await falha(
      service.vincularProfessor(
        massa.adminA.id,
        massa.escolaA.id,
        turma.id,
        massa.profA.id,
      ),
      ConflictException,
      'Turma arquivada',
    );
    await falha(
      service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
        massa.alunoA1.id,
      ]),
      ConflictException,
      'Turma arquivada',
    );
    await service.removerAluno(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      novo.id,
    );
    await expect(
      service.reativar(massa.adminA.id, massa.escolaA.id, turma.id),
    ).resolves.toMatchObject({ ativa: true });
    expect(await acoes(turma.id)).toEqual([
      'turma.criada',
      'turma.aluno_adicionado',
      'turma.arquivada',
      'turma.aluno_removido',
      'turma.reativada',
    ]);
  });

  it('turma de outra escola responde 404 em leitura e escrita', async () => {
    const turma = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Isolada',
      ano_letivo: 2026,
    });
    const naoEncontrada = (p: Promise<unknown>) =>
      falha(p, NotFoundException, 'Turma não encontrada');
    await naoEncontrada(service.listarProfessores(massa.escolaB.id, turma.id));
    await naoEncontrada(
      service.listarAlunos(massa.escolaB.id, turma.id, {
        page: 1,
        pageSize: 25,
      }),
    );
    await naoEncontrada(
      service.atualizar(massa.adminA.id, massa.escolaB.id, turma.id, {
        nome: 'Y',
        ano_letivo: 2026,
      }),
    );
    await naoEncontrada(
      service.arquivar(massa.adminA.id, massa.escolaB.id, turma.id),
    );
    await naoEncontrada(
      service.adicionarAlunos(massa.adminA.id, massa.escolaB.id, turma.id, [
        massa.alunoB1.id,
      ]),
    );
    const listaB = await service.listar(massa.escolaB.id, {
      page: 1,
      pageSize: 100,
    });
    expect(listaB.items.map((t) => t.id)).not.toContain(turma.id);
  });

  it('lista com contagens, próxima abertura e filtros', async () => {
    const turma = await service.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Lista',
      ano_letivo: 2030,
    });
    await service.vincularProfessor(
      massa.adminA.id,
      massa.escolaA.id,
      turma.id,
      massa.profA.id,
    );
    await service.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      massa.alunoA1.id,
    ]);
    const futuro = new Date('2099-11-18T08:00:00-03:00');
    await source.getRepository(TurmaAulaAbertura).save([
      {
        turma_id: turma.id,
        aula_id: massa.aulas[0].id,
        abre_em: new Date('2026-01-01T08:00:00-03:00'),
        definido_por_id: massa.adminA.id,
      },
      {
        turma_id: turma.id,
        aula_id: massa.aulas[1].id,
        abre_em: futuro,
        definido_por_id: massa.adminA.id,
      },
    ]);
    const lista = await service.listar(massa.escolaA.id, {
      page: 1,
      pageSize: 25,
      ano_letivo: 2030,
    });
    expect(lista.items).toEqual([
      {
        id: turma.id,
        nome: 'Lista',
        ano_letivo: 2030,
        ativa: true,
        professores: 1,
        alunos: 1,
        proxima_abertura: futuro.toISOString(),
      },
    ]);
    const busca = await service.listar(massa.escolaA.id, {
      page: 1,
      pageSize: 25,
      busca: 'list',
    });
    expect(busca.items.map((t) => t.id)).toEqual([turma.id]);
    await service.arquivar(massa.adminA.id, massa.escolaA.id, turma.id);
    expect(
      (
        await service.listar(massa.escolaA.id, {
          page: 1,
          pageSize: 25,
          ano_letivo: 2030,
          situacao: 'ativa',
        })
      ).total,
    ).toBe(0);
    expect(
      (
        await service.listar(massa.escolaA.id, {
          page: 1,
          pageSize: 25,
          ano_letivo: 2030,
          situacao: 'arquivada',
        })
      ).total,
    ).toBe(1);
  });

  it('confere a empresa da rota da plataforma', async () => {
    await expect(
      service.assertEmpresa(massa.escolaA.id),
    ).resolves.toBeUndefined();
    await falha(
      service.assertEmpresa(999999),
      NotFoundException,
      'Empresa não encontrada',
    );
  });
});
