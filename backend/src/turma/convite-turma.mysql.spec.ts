import { BadRequestException, ForbiddenException } from '@nestjs/common';
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
import { Empresa } from '../empresa/empresa.entity';
import { Convite } from '../admin/entities/convite.entity';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ConvitesService } from '../admin/convites.service';
import { ConviteTurma } from './entities/convite-turma.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaService } from './turma.service';
import { vincularAlunoPorConvite } from './turma-vinculos';

turmaIntegration('Convites de professor e de aluno com turma', () => {
  let source: DataSource;
  let massa: Massa;
  let convites: ConvitesService;
  let turmas: TurmaService;

  beforeAll(async () => {
    ({ source } = await turmaFixture());
    massa = await semear(source);
    const audit = new AdminAuditService(source);
    turmas = new TurmaService(source, audit);
    convites = new ConvitesService(
      source.getRepository(Convite),
      source.getRepository(Usuario),
      source.getRepository(Empresa),
      {} as never,
      audit,
      {} as never,
      source,
    );
  }, 60_000);

  afterAll(async () => {
    await source?.destroy();
  });

  it('professor exige e-mail e nasce como convite de uso único por e-mail', async () => {
    await falha(
      convites.criar(massa.adminA.id, { papel: 'teacher' }),
      BadRequestException,
      'Convites de professor exigem um e-mail',
    );
    const { convite } = await convites.criar(massa.adminA.id, {
      papel: 'teacher',
      email: 'nova.professora@fixture.test',
      max_uses: 5,
      registration_mode: 'school_student',
    });
    expect(convite).toMatchObject({
      role: 'teacher',
      registration_mode: 'legacy_email',
      max_uses: 1,
    });
  });

  it('admin da escola não emite convite de administrador', async () => {
    await falha(
      convites.criar(massa.adminA.id, {
        papel: 'admin',
        email: 'adm@fixture.test',
      }),
      ForbiddenException,
      'Somente a plataforma emite convite de administrador',
    );
  });

  it('turma só vale para aluno, da mesma escola e ativa', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Convites',
      ano_letivo: 2026,
    });
    const turmaB = await turmas.criar(massa.adminA.id, massa.escolaB.id, {
      nome: 'Convites B',
      ano_letivo: 2026,
    });
    await falha(
      convites.criar(massa.adminA.id, {
        papel: 'teacher',
        email: 'p2@fixture.test',
        turma_id: turma.id,
      }),
      BadRequestException,
      'Turma só vale para convite de aluno',
    );
    await falha(
      convites.criar(massa.adminA.id, {
        registration_mode: 'school_student',
        turma_id: turmaB.id,
      }),
      BadRequestException,
      'Selecione uma turma ativa desta escola',
    );
    const { convite } = await convites.criar(massa.adminA.id, {
      registration_mode: 'school_student',
      turma_id: turma.id,
    });
    expect(
      await source
        .getRepository(ConviteTurma)
        .findOneBy({ convite_id: convite.id }),
    ).toEqual({ convite_id: convite.id, turma_id: turma.id });
    await turmas.arquivar(massa.adminA.id, massa.escolaA.id, turma.id);
    await falha(
      convites.criar(massa.adminA.id, {
        registration_mode: 'school_student',
        turma_id: turma.id,
      }),
      BadRequestException,
      'Selecione uma turma ativa desta escola',
    );
  });

  it('recusa cadastro por convite ligado a turma arquivada', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Arquivada no cadastro',
      ano_letivo: 2026,
    });
    const { convite } = await convites.criar(massa.adminA.id, {
      registration_mode: 'school_student',
      turma_id: turma.id,
    });
    await source.query('UPDATE turma SET ativa = 0 WHERE id = ?', [turma.id]);
    const aluno = await source.getRepository(Usuario).save({
      name: 'Aluno Tardio',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
    });
    await falha(
      source.transaction((manager) =>
        vincularAlunoPorConvite(manager, convite.id, aluno),
      ),
      ForbiddenException,
      'Este convite não está mais disponível',
    );
  });

  it('vincula o aluno cadastrado pelo convite à turma, e só alunos', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: 'Cadastro',
      ano_letivo: 2026,
    });
    const { convite } = await convites.criar(massa.adminA.id, {
      registration_mode: 'school_student',
      turma_id: turma.id,
    });
    const aluno = await source.getRepository(Usuario).save({
      name: 'Aluno Convidado',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
    });
    await source.transaction((manager) =>
      vincularAlunoPorConvite(manager, convite.id, aluno),
    );
    expect(
      await source
        .getRepository(TurmaAluno)
        .findOneBy({ usuario_id: aluno.id }),
    ).toMatchObject({ turma_id: turma.id });
    const professor = await source.getRepository(Usuario).save({
      name: 'Prof Convidado',
      role: Role.TEACHER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
      email: 'pc@fixture.test',
    });
    await source.transaction((manager) =>
      vincularAlunoPorConvite(manager, convite.id, professor),
    );
    expect(
      await source
        .getRepository(TurmaAluno)
        .countBy({ usuario_id: professor.id }),
    ).toBe(0);
    const semTurma = await convites.criar(massa.adminA.id, {
      registration_mode: 'school_student',
    });
    const outro = await source.getRepository(Usuario).save({
      name: 'Aluno Sem Turma',
      role: Role.USER,
      empresa_id: massa.escolaA.id,
      password: 'x',
      active: true,
    });
    await source.transaction((manager) =>
      vincularAlunoPorConvite(manager, semTurma.convite.id, outro),
    );
    expect(
      await source.getRepository(TurmaAluno).countBy({ usuario_id: outro.id }),
    ).toBe(0);
  });
});
