import { EntityManager, In } from 'typeorm';
import { Role } from '../auth/roles.enum';
import { Usuario } from '../usuario/usuario.entity';
import { Convite } from '../admin/entities/convite.entity';
import { ConviteTurma } from './entities/convite-turma.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { Turma } from './entities/turma.entity';
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

/** Cadastro por convite ligado a uma turma: o aluno entra nela na mesma transação. */
export async function vincularAlunoPorConvite(
  manager: EntityManager,
  conviteId: number,
  usuario: Pick<Usuario, 'id' | 'empresa_id' | 'role'>,
): Promise<void> {
  if (usuario.role !== Role.USER) return;
  const ligacao = await manager
    .getRepository(ConviteTurma)
    .findOne({ where: { convite_id: conviteId } });
  if (!ligacao) return;
  const turma = await manager.getRepository(Turma).findOne({
    where: {
      id: ligacao.turma_id,
      empresa_id: usuario.empresa_id,
      ativa: true,
    },
  });
  if (!turma) return;
  await manager.getRepository(TurmaAluno).insert({
    usuario_id: usuario.id,
    turma_id: turma.id,
    entrou_em: new Date(),
  });
}

/** Ao arquivar a turma, convites ainda não revogados que levariam alunos a ela deixam de valer. */
export async function revogarConvitesDaTurma(
  manager: EntityManager,
  turmaId: number,
): Promise<number> {
  const ligados = await manager
    .getRepository(ConviteTurma)
    .find({ where: { turma_id: turmaId } });
  if (!ligados.length) return 0;
  const result = await manager
    .getRepository(Convite)
    .update(
      { id: In(ligados.map((row) => row.convite_id)), revoked: false },
      { revoked: true },
    );
  return result.affected ?? 0;
}

/** Um aluno por turma: quem já está em outra turma é movido e o progresso fica intacto. */
export async function vincularAlunosNaTurma(
  manager: EntityManager,
  turma: Turma,
  ids: number[],
) {
  const vinculos = manager.getRepository(TurmaAluno);
  const atuais = new Map(
    (
      await vinculos.find({
        where: { usuario_id: In(ids) },
        lock: { mode: 'pessimistic_write' },
      })
    ).map((row) => [row.usuario_id, row.turma_id]),
  );
  const agora = new Date();
  const adicionados: number[] = [];
  const movidos: Array<{ usuario_id: number; de: number }> = [];
  for (const id of ids) {
    const anterior = atuais.get(id);
    if (anterior === turma.id) continue;
    if (anterior === undefined) {
      await vinculos.insert({
        usuario_id: id,
        turma_id: turma.id,
        entrou_em: agora,
      });
      adicionados.push(id);
    } else {
      await vinculos.update(
        { usuario_id: id },
        { turma_id: turma.id, entrou_em: agora },
      );
      movidos.push({ usuario_id: id, de: anterior });
    }
  }
  return { adicionados, movidos };
}
