import { DataSource } from 'typeorm';
import { Role } from '../../src/auth/roles.enum';
import { Empresa } from '../../src/empresa/empresa.entity';
import { Usuario } from '../../src/usuario/usuario.entity';
import { Modulo } from '../../src/conteudo/modulo/modulo.entity';
import { Aula } from '../../src/conteudo/aula/aula.entity';
import { UsuarioAula } from '../../src/conteudo/usuario-aula/usuario-aula.entity';
import { Convite } from '../../src/admin/entities/convite.entity';
import { AdminAuditEvent } from '../../src/admin/entities/admin-audit-event.entity';
import { Turma } from '../../src/turma/entities/turma.entity';
import { TurmaProfessor } from '../../src/turma/entities/turma-professor.entity';
import { TurmaAluno } from '../../src/turma/entities/turma-aluno.entity';
import { TurmaModulo } from '../../src/turma/entities/turma-modulo.entity';
import { TurmaAulaAbertura } from '../../src/turma/entities/turma-aula-abertura.entity';
import { ConviteTurma } from '../../src/turma/entities/convite-turma.entity';
import { CreateTurmas1793577600000 } from '../../src/database/migrations/1793577600000-create-turmas';

export const turmaIntegration =
  process.env.RUN_TURMA_INTEGRATION === '1' ? describe : describe.skip;

function fixturePort(): number {
  if (process.env.RUN_TURMA_INTEGRATION !== '1')
    throw new Error('Fixture de turmas exige opt-in explícito');
  const port = Number(process.env.TURMA_MYSQL_PORT);
  if (!Number.isInteger(port) || port < 1024 || port > 65535)
    throw new Error('Informe TURMA_MYSQL_PORT do container descartável');
  return port;
}

/**
 * Banco descartável do compose local `secureplay-turmas`: apaga o schema a cada
 * abertura. Nunca carrega .env nem AppModule.
 */
export async function turmaFixture() {
  const source = await new DataSource({
    type: 'mysql',
    host: '127.0.0.1',
    port: fixturePort(),
    username: 'root',
    password: 'turma-fixture-only',
    database: 'turma_fixture',
    entities: [
      Empresa,
      Usuario,
      Modulo,
      Aula,
      UsuarioAula,
      Convite,
      AdminAuditEvent,
      Turma,
      TurmaProfessor,
      TurmaAluno,
      TurmaModulo,
      TurmaAulaAbertura,
      ConviteTurma,
    ],
    timezone: '-03:00',
    synchronize: true,
    dropSchema: true,
    logging: false,
    poolSize: 10,
  }).initialize();
  const runner = source.createQueryRunner();
  try {
    await new CreateTurmas1793577600000().up(runner);
  } finally {
    await runner.release();
  }
  return { source };
}

export interface Massa {
  escolaA: Empresa;
  escolaB: Empresa;
  adminA: Usuario;
  profA: Usuario;
  profB: Usuario;
  alunoA1: Usuario;
  alunoA2: Usuario;
  alunoB1: Usuario;
  m1: Modulo;
  m2: Modulo;
  inativo: Modulo;
  aulas: Aula[];
}

let sequencia = 0;
export async function semear(source: DataSource): Promise<Massa> {
  const empresas = source.getRepository(Empresa);
  const usuarios = source.getRepository(Usuario);
  const escolaA = await empresas.save({ nome: 'Escola A' });
  const escolaB = await empresas.save({ nome: 'Escola B' });
  const pessoa = (name: string, role: Role, empresa: Empresa, email = true) =>
    usuarios.save({
      name,
      role,
      empresa_id: empresa.id,
      password: 'hash-fixture',
      email: email
        ? `${name.toLowerCase().replace(/\W/g, '')}${++sequencia}@fixture.test`
        : null,
      active: true,
    });
  const modulos = source.getRepository(Modulo);
  const modulo = (title: string, order: number, active = true) =>
    modulos.save({
      title,
      description: title,
      category: 'Segurança',
      order,
      active,
    });
  const m1 = await modulo('Senhas', 1);
  const m2 = await modulo('Golpes', 2);
  const inativo = await modulo('Antigo', 3, false);
  const aulas = await source.getRepository(Aula).save([
    { modulo_id: m1.id, title: 'Senhas fortes', order: 1 },
    { modulo_id: m1.id, title: 'Frase-senha', order: 2 },
    { modulo_id: m2.id, title: 'Links suspeitos', order: 1 },
  ]);
  return {
    escolaA,
    escolaB,
    adminA: await pessoa('Admin A', Role.ADMIN, escolaA),
    profA: await pessoa('Prof A', Role.TEACHER, escolaA),
    profB: await pessoa('Prof B', Role.TEACHER, escolaB),
    alunoA1: await pessoa('Aluno A1', Role.USER, escolaA, false),
    alunoA2: await pessoa('Aluno A2', Role.USER, escolaA, false),
    alunoB1: await pessoa('Aluno B1', Role.USER, escolaB, false),
    m1,
    m2,
    inativo,
    aulas,
  };
}

export async function falha(
  promise: Promise<unknown>,
  tipo: new (...args: never[]) => Error,
  mensagem: string,
) {
  const erro = await promise.then(
    () => null,
    (e: unknown) => e,
  );
  expect(erro).toBeInstanceOf(tipo);
  expect((erro as Error).message).toBe(mensagem);
}
