import { BadRequestException } from '@nestjs/common';
import { EntityManager, In, SelectQueryBuilder } from 'typeorm';
import { Usuario } from '../usuario/usuario.entity';
import { Turma } from './entities/turma.entity';
import { TurmaAluno } from './entities/turma-aluno.entity';

const PAPEIS = ['user', 'teacher', 'admin'] as const;
export type PapelFiltro = (typeof PAPEIS)[number];

/** Filtros da listagem de usuários: papel e turma (id ou 'nenhuma'). */
export function filtrarPorTurma(
  query: SelectQueryBuilder<Usuario>,
  filtros: { papel?: PapelFiltro; turma?: number | 'nenhuma' },
): void {
  if (filtros.papel)
    query.andWhere('usuario.role = :papel', { papel: filtros.papel });
  if (filtros.turma === 'nenhuma')
    query
      .leftJoin(
        TurmaAluno,
        'turma_aluno',
        'turma_aluno.usuario_id = usuario.id',
      )
      .andWhere('turma_aluno.usuario_id IS NULL');
  else if (filtros.turma !== undefined)
    query.innerJoin(
      TurmaAluno,
      'turma_aluno',
      'turma_aluno.usuario_id = usuario.id AND turma_aluno.turma_id = :turmaFiltro',
      { turmaFiltro: filtros.turma },
    );
}

export async function turmasDosUsuarios(
  manager: EntityManager,
  usuarioIds: number[],
): Promise<Map<number, { id: number; nome: string }>> {
  if (!usuarioIds.length) return new Map();
  const vinculos = await manager
    .getRepository(TurmaAluno)
    .find({ where: { usuario_id: In(usuarioIds) } });
  if (!vinculos.length) return new Map();
  const turmas = await manager.getRepository(Turma).find({
    where: { id: In([...new Set(vinculos.map((v) => v.turma_id))]) },
  });
  const nomes = new Map(turmas.map((turma) => [turma.id, turma.nome]));
  return new Map(
    vinculos.map((v) => [
      v.usuario_id,
      { id: v.turma_id, nome: nomes.get(v.turma_id) ?? '' },
    ]),
  );
}

/** Query string → filtros; valores fora do contrato respondem 400. */
export function filtrosDeTurmaDaQuery(papel?: string, turma?: string) {
  if (papel !== undefined && !PAPEIS.includes(papel as PapelFiltro))
    throw new BadRequestException('Papel inválido');
  if (turma !== undefined && turma !== 'nenhuma' && !/^[1-9]\d*$/.test(turma))
    throw new BadRequestException('Turma inválida');
  return {
    papel: papel as PapelFiltro | undefined,
    turma:
      turma === undefined
        ? undefined
        : turma === 'nenhuma'
          ? ('nenhuma' as const)
          : Number(turma),
  };
}
