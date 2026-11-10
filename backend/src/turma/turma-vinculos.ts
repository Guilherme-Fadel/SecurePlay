import { EntityManager } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaProfessor } from './entities/turma-professor.entity';

/**
 * Vínculos de turma acompanham o papel: só `teacher` leciona e só `user` estuda.
 * Roda na transação de quem muda o papel; o progresso do usuário não é tocado.
 */
export async function removerVinculosAoMudarPapel(
  manager: EntityManager,
  usuarioId: number,
  anterior: Role,
  novo: Role,
): Promise<void> {
  if (anterior === novo) return;
  if (anterior === Role.TEACHER)
    await manager.delete(TurmaProfessor, { usuario_id: usuarioId });
  if (anterior === Role.USER)
    await manager.delete(TurmaAluno, { usuario_id: usuarioId });
}
