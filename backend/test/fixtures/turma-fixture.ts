import { DataSource } from 'typeorm';
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
