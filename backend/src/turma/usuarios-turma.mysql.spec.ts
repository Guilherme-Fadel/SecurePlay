import { DataSource } from 'typeorm';
import {
  Massa,
  semear,
  turmaFixture,
  turmaIntegration,
} from '../../test/fixtures/turma-fixture';
import { Usuario } from '../usuario/usuario.entity';
import { Empresa } from '../empresa/empresa.entity';
import { Convite } from '../admin/entities/convite.entity';
import { AdminAuditService } from '../admin/admin-audit.service';
import { ConvitesService } from '../admin/convites.service';
import { TurmaService } from './turma.service';

turmaIntegration('Usuários da escola com turma', () => {
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

  it('filtra por papel, por turma e por quem ainda não tem turma, mostrando a turma', async () => {
    const turma = await turmas.criar(massa.adminA.id, massa.escolaA.id, {
      nome: '5º A',
      ano_letivo: 2026,
    });
    await turmas.adicionarAlunos(massa.adminA.id, massa.escolaA.id, turma.id, [
      massa.alunoA1.id,
    ]);
    const listar = (filtros: object) =>
      convites.listarUsuariosPaginadosDaEmpresa(massa.escolaA.id, {
        page: 1,
        pageSize: 100,
        ...filtros,
      });

    const professores = await listar({ papel: 'teacher' });
    expect(professores.items.map((u) => u.id)).toEqual([massa.profA.id]);

    const daTurma = await listar({ turma: turma.id });
    expect(daTurma.items.map((u) => [u.id, u.turma])).toEqual([
      [massa.alunoA1.id, { id: turma.id, nome: '5º A' }],
    ]);

    const semTurma = await listar({ papel: 'user', turma: 'nenhuma' });
    expect(semTurma.items.map((u) => u.id)).toEqual([massa.alunoA2.id]);
    expect(semTurma.items[0].turma).toBeNull();

    const todos = await listar({});
    expect(todos.items.find((u) => u.id === massa.alunoA1.id)?.turma).toEqual({
      id: turma.id,
      nome: '5º A',
    });
    expect(todos.items.map((u) => u.id)).not.toContain(massa.alunoB1.id);
  });
});
