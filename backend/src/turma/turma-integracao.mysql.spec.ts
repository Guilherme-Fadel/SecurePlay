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
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Modulo } from '../conteudo/modulo/modulo.entity';
import { Aula } from '../conteudo/aula/aula.entity';
import { UsuarioAula } from '../conteudo/usuario-aula/usuario-aula.entity';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ModuloService } from '../conteudo/modulo/modulo.service';
import { CreateTurmas1793577600000 } from '../database/migrations/1793577600000-create-turmas';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { TurmaAcessoService } from './turma-acesso.service';
import { TurmaService } from './turma.service';
import { JornadaEdicaoService } from './jornada-edicao.service';
import { JornadaTurmaService } from './jornada-turma.service';
import { vincularAlunoPorConvite } from './turma-vinculos';

const TABELAS = [
  'turma',
  'turma_professor',
  'turma_aluno',
  'turma_modulo',
  'turma_aula_abertura',
  'convite_turma',
];

turmaIntegration('Turmas — integração em MySQL descartável', () => {
  let source: DataSource;
  let massa: Massa;
  let turmas: TurmaService;
  let edicao: JornadaEdicaoService;
  let jornada: JornadaTurmaService;
  let modulos: ModuloService;

  beforeAll(async () => {
    ({ source } = await turmaFixture());
    massa = await semear(source);
    const audit = new AdminAuditService(source);
    turmas = new TurmaService(source, audit);
    edicao = new JornadaEdicaoService(
      source,
      new TurmaAcessoService(source),
      audit,
      { emit: jest.fn() } as unknown as EventEmitter2,
    );
    jornada = new JornadaTurmaService(source);
    modulos = new ModuloService(
      source.getRepository(Modulo),
      source.getRepository(Aula),
      source.getRepository(UsuarioAula),
      jornada,
    );
  }, 60_000);

  afterAll(async () => {
    jest.useRealTimers();
    await source?.destroy();
  });

  it('migration desce e sobe de novo sem tocar as tabelas existentes', async () => {
    const runner = source.createQueryRunner();
    try {
      await new CreateTurmas1793577600000().down(runner);
      for (const tabela of TABELAS)
        expect(await runner.hasTable(tabela)).toBe(false);
      expect(await runner.hasTable('usuario')).toBe(true);
      expect(await runner.hasTable('convite')).toBe(true);
      await new CreateTurmas1793577600000().up(runner);
      for (const tabela of TABELAS)
        expect(await runner.hasTable(tabela)).toBe(true);
      await new CreateTurmas1793577600000().up(runner);
    } finally {
      await runner.release();
    }
  });

  it('clique duplo em "abrir agora": uma abertura, a outra chamada recebe 409', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Clique duplo',
      ano_letivo: 2026,
    });
    const aula = massa.aulas[0].id;
    const [primeira, segunda] = await Promise.allSettled([
      edicao.definirAbertura(massa.adminA.id, turma.id, aula, {
        modo: 'agora',
      }),
      edicao.definirAbertura(massa.adminA.id, turma.id, aula, {
        modo: 'agora',
      }),
    ]);
    const status = [primeira.status, segunda.status].sort();
    expect(status).toEqual(['fulfilled', 'rejected']);
    const rejeitada = [primeira, segunda].find(
      (r) => r.status === 'rejected',
    ) as PromiseRejectedResult;
    expect(rejeitada.reason).toBeInstanceOf(ConflictException);
    expect((rejeitada.reason as Error).message).toBe(
      'Esta aula já está aberta',
    );
    expect(
      await source
        .getRepository(TurmaAulaAbertura)
        .countBy({ turma_id: turma.id, aula_id: aula }),
    ).toBe(1);
  });

  it('grava em horário de Brasília e compara com o relógio da aplicação', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Fuso',
      ano_letivo: 2026,
    });
    const aluno = await source.getRepository(Usuario).save({
      name: 'Aluno Fuso',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
    });
    await turmas.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      aluno.id,
    ]);
    const aula = massa.aulas[0];
    await source.getRepository(TurmaAulaAbertura).save({
      turma_id: turma.id,
      aula_id: aula.id,
      abre_em: new Date('2026-11-18T08:00:00-03:00'),
      definido_por_id: massa.adminA.id,
    });
    const [linha] = await source.query<Array<{ local: string }>>(
      "SELECT DATE_FORMAT(abre_em, '%Y-%m-%d %H:%i:%s') AS local FROM turma_aula_abertura WHERE turma_id = ? AND aula_id = ?",
      [turma.id, aula.id],
    );
    expect(linha.local).toBe('2026-11-18 08:00:00');
    expect(
      (await jornada.jornadaDoAluno(aluno.id))!.aberturas
        .get(aula.id)!
        .toISOString(),
    ).toBe('2026-11-18T11:00:00.000Z');
    const relogio = (iso: string) =>
      jest.useFakeTimers({
        now: new Date(iso),
        doNotFake: [
          'nextTick',
          'setImmediate',
          'clearImmediate',
          'setTimeout',
          'clearTimeout',
          'setInterval',
          'clearInterval',
          'queueMicrotask',
          'hrtime',
          'performance',
        ],
      });
    relogio('2026-11-18T07:59:59-03:00');
    await expect(modulos.assertAulaDaTurma(aula, aluno.id)).rejects.toThrow(
      'Esta aula abre em 18/11 às 08:00.',
    );
    relogio('2026-11-18T08:00:01-03:00');
    await expect(modulos.assertAulaDaTurma(aula, aluno.id)).resolves.toBe(true);
    jest.useRealTimers();
  });

  it('falha depois do vínculo desfaz o cadastro inteiro', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Rollback',
      ano_letivo: 2026,
    });
    const convite = await source.query<{ insertId: number }>(
      "INSERT INTO convite (token_hash, empresa_id, criado_por_id, expires_at, role, registration_mode) VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL 1 DAY), 'user', 'school_student')",
      [`rollback-${Date.now()}`, massa.escolaA.id, massa.adminA.id],
    );
    await source.query(
      'INSERT INTO convite_turma (convite_id, turma_id) VALUES (?, ?)',
      [convite.insertId, turma.id],
    );
    await expect(
      source.transaction(async (manager) => {
        const aluno = await manager.getRepository(Usuario).save({
          name: 'Aluno Rollback',
          role: Role.USER,
          empresa_id: massa.escolaA.id,
          password: 'x',
          active: true,
        });
        await vincularAlunoPorConvite(manager, convite.insertId, aluno);
        throw new Error('falha simulada depois do vínculo');
      }),
    ).rejects.toThrow('falha simulada depois do vínculo');
    expect(
      await source.getRepository(Usuario).countBy({ name: 'Aluno Rollback' }),
    ).toBe(0);
    expect(
      await source.getRepository(TurmaAluno).countBy({ turma_id: turma.id }),
    ).toBe(0);
  });

  it('promoção concorrente a professor não deixa a conta matriculada como aluno', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Corrida de papel',
      ano_letivo: 2026,
    });
    const aluno = await source.getRepository(Usuario).save({
      name: 'Aluno Promovido',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
      email: `promovido${Date.now()}@fixture.test`,
    });
    const outro = source.createQueryRunner();
    await outro.connect();
    await outro.startTransaction();
    try {
      await outro.query('SELECT id FROM usuario WHERE id = ? FOR UPDATE', [
        aluno.id,
      ]);
      const adicionar = turmas
        .adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
          aluno.id,
        ])
        .then(
          () => 'adicionado',
          (erro: unknown) => erro,
        );
      await new Promise((resolve) => setTimeout(resolve, 400));
      await outro.query("UPDATE usuario SET role = 'teacher' WHERE id = ?", [
        aluno.id,
      ]);
      await outro.commitTransaction();
      const resultado = await adicionar;
      expect(resultado).toBeInstanceOf(BadRequestException);
    } finally {
      if (outro.isTransactionActive) await outro.rollbackTransaction();
      await outro.release();
    }
    expect(
      await source.getRepository(TurmaAluno).countBy({ usuario_id: aluno.id }),
    ).toBe(0);
  });

  it('rebaixamento concorrente de professor não deixa aluno vinculado como professor', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Corrida de professor',
      ano_letivo: 2026,
    });
    const prof = await source.getRepository(Usuario).save({
      name: 'Professor Rebaixado',
      role: Role.TEACHER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
      email: `rebaixado${Date.now()}@fixture.test`,
    });
    const outro = source.createQueryRunner();
    await outro.connect();
    await outro.startTransaction();
    try {
      await outro.query('SELECT id FROM usuario WHERE id = ? FOR UPDATE', [
        prof.id,
      ]);
      const vincular = turmas
        .vincularProfessor(massa.adminA.id, massa.escolaA.id, turma.id, prof.id)
        .then(
          () => 'vinculado',
          (erro: unknown) => erro,
        );
      await new Promise((resolve) => setTimeout(resolve, 400));
      await outro.query("UPDATE usuario SET role = 'user' WHERE id = ?", [
        prof.id,
      ]);
      await outro.commitTransaction();
      expect(await vincular).toBeInstanceOf(BadRequestException);
    } finally {
      if (outro.isTransactionActive) await outro.rollbackTransaction();
      await outro.release();
    }
    expect(
      await source
        .getRepository(TurmaProfessor)
        .countBy({ usuario_id: prof.id }),
    ).toBe(0);
  });

  it('escolas isoladas: admin e professor de outra escola não alcançam a turma', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Isolamento',
      ano_letivo: 2026,
    });
    const adminB = await source.getRepository(Usuario).save({
      name: 'Admin B',
      role: Role.ADMIN,
      empresa_id: massa.escolaB.id,
      password: 'x',
      active: true,
      email: `adminb${Date.now()}@fixture.test`,
    });
    for (const ator of [adminB.id, massa.profB.id])
      await falha(
        edicao.obter(ator, turma.id),
        NotFoundException,
        'Turma não encontrada',
      );
    await falha(
      edicao.definirAbertura(adminB.id, turma.id, massa.aulas[0].id, {
        modo: 'agora',
      }),
      NotFoundException,
      'Turma não encontrada',
    );
    await expect(jornada.jornadaDoAluno(massa.alunoB1.id)).resolves.toBeNull();
    expect((await edicao.minhas(adminB.id)).map((t) => t.id)).not.toContain(
      turma.id,
    );
  });

  it('mede a listagem de módulos com e sem turma', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Medida',
      ano_letivo: 2026,
    });
    const comTurma = await source.getRepository(Usuario).save({
      name: 'Aluno Medida',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
    });
    await turmas.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      comTurma.id,
    ]);
    const medir = async (usuarioId: number) => {
      await modulos.findAll(usuarioId);
      const inicio = process.hrtime.bigint();
      for (let i = 0; i < 20; i++) await modulos.findAll(usuarioId);
      return Number(process.hrtime.bigint() - inicio) / 20 / 1e6;
    };
    const sem = await medir(massa.alunoB1.id);
    const com = await medir(comTurma.id);
    process.stdout.write(
      `[medida] findAll médio: sem turma ${sem.toFixed(2)} ms, com turma ${com.toFixed(2)} ms\n`,
    );
    expect(com).toBeLessThan(2000);
  });
});
