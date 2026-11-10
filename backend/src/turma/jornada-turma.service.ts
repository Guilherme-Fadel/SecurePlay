import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { TurmaAluno } from './entities/turma-aluno.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';

export interface JornadaDaTurma {
  turmaId: number;
  moduloIds: number[];
  aberturas: Map<number, Date>;
}

/** Lê a jornada da turma do aluno; `null` mantém a jornada global de hoje. */
@Injectable()
export class JornadaTurmaService {
  constructor(@Inject('DATA_SOURCE') private readonly dataSource: DataSource) {}

  async jornadaDoAluno(
    usuarioId: number,
    manager?: EntityManager,
  ): Promise<JornadaDaTurma | null> {
    const source = manager ?? this.dataSource.manager;
    const vinculo = await source
      .getRepository(TurmaAluno)
      .findOne({ where: { usuario_id: usuarioId } });
    if (!vinculo) return null;
    const [modulos, aberturas] = await Promise.all([
      source.getRepository(TurmaModulo).find({
        where: { turma_id: vinculo.turma_id },
        order: { posicao: 'ASC' },
      }),
      source
        .getRepository(TurmaAulaAbertura)
        .find({ where: { turma_id: vinculo.turma_id } }),
    ]);
    return {
      turmaId: vinculo.turma_id,
      moduloIds: modulos.map((row) => row.modulo_id),
      aberturas: new Map(
        aberturas.map((row) => [row.aula_id, new Date(row.abre_em)]),
      ),
    };
  }
}
