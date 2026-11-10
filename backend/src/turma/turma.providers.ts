import { DataSource } from 'typeorm';
import { Turma } from './entities/turma.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { ConviteTurma } from './entities/convite-turma.entity';

const repository = (provide: string, entity: new () => object) => ({
  provide,
  useFactory: (dataSource: DataSource) => dataSource.getRepository(entity),
  inject: ['DATA_SOURCE'],
});

export const turmaProviders = [
  repository('TURMA_REPOSITORY', Turma),
  repository('TURMA_PROFESSOR_REPOSITORY', TurmaProfessor),
  repository('TURMA_ALUNO_REPOSITORY', TurmaAluno),
  repository('TURMA_MODULO_REPOSITORY', TurmaModulo),
  repository('TURMA_AULA_ABERTURA_REPOSITORY', TurmaAulaAbertura),
  repository('CONVITE_TURMA_REPOSITORY', ConviteTurma),
];
