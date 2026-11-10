import { EntityManager, In } from 'typeorm';
import { Modulo } from '../conteudo/modulo/modulo.entity';
import { Aula } from '../conteudo/aula/aula.entity';
import { sortAulasByModuleSequence } from '../conteudo/aula/aula-order';
import { Turma } from './entities/turma.entity';
import { TurmaModulo } from './entities/turma-modulo.entity';
import { TurmaAulaAbertura } from './entities/turma-aula-abertura.entity';
import { AulaRef } from './jornada-regras';

export type EstadoEdicao = 'fechada' | 'agendada' | 'aberta';

export interface JornadaEdicao {
  turma: { id: number; nome: string; ano_letivo: number; ativa: boolean };
  resumo: {
    aulasAbertas: number;
    proximaAbertura: {
      aula_id: number;
      titulo: string;
      abre_em: string;
    } | null;
  };
  modulos: Array<{
    modulo_id: number;
    titulo: string;
    posicao: number;
    aulas: Array<{
      aula_id: number;
      titulo: string;
      ordem: number;
      estado: EstadoEdicao;
      abre_em: string | null;
    }>;
  }>;
  catalogo: Array<{ modulo_id: number; titulo: string }>;
}

/** Jornada da turma lida para edição: módulos ativos na ordem da turma e aberturas. */
export interface JornadaCarregada {
  modulos: Array<{ modulo: Modulo; posicao: number; aulas: Aula[] }>;
  catalogo: Modulo[];
  aberturas: Map<number, Date>;
}

/** DATETIME sem fração arredonda no MySQL: grava sempre em segundos inteiros. */
export function segundos(data: Date): Date {
  return new Date(Math.floor(data.getTime() / 1000) * 1000);
}

export function ordemDaJornada(jornada: JornadaCarregada): AulaRef[] {
  return jornada.modulos.flatMap(({ aulas }) =>
    aulas.map((aula) => ({
      id: aula.id,
      modulo_id: aula.modulo_id,
      titulo: aula.title,
    })),
  );
}

export async function carregarJornada(
  manager: EntityManager,
  turmaId: number,
): Promise<JornadaCarregada> {
  const [vinculos, ativos, aberturas] = await Promise.all([
    manager
      .getRepository(TurmaModulo)
      .find({ where: { turma_id: turmaId }, order: { posicao: 'ASC' } }),
    manager
      .getRepository(Modulo)
      .find({ where: { active: true }, order: { order: 'ASC', id: 'ASC' } }),
    manager
      .getRepository(TurmaAulaAbertura)
      .find({ where: { turma_id: turmaId } }),
  ]);
  const porId = new Map(ativos.map((modulo) => [modulo.id, modulo]));
  const ids = vinculos.map((v) => v.modulo_id).filter((id) => porId.has(id));
  const aulas = ids.length
    ? await manager.getRepository(Aula).find({
        where: { modulo_id: In(ids), active: true },
        order: { order: 'ASC', id: 'ASC' },
      })
    : [];
  const naJornada = new Set(ids);
  return {
    modulos: ids.map((id, index) => ({
      modulo: porId.get(id)!,
      posicao: index + 1,
      aulas: sortAulasByModuleSequence(
        aulas.filter((aula) => aula.modulo_id === id),
      ),
    })),
    catalogo: ativos.filter((modulo) => !naJornada.has(modulo.id)),
    aberturas: new Map(
      aberturas.map((row) => [row.aula_id, new Date(row.abre_em)]),
    ),
  };
}

function estadoDaAula(abreEm: Date | undefined, agora: Date): EstadoEdicao {
  if (!abreEm) return 'fechada';
  return abreEm <= agora ? 'aberta' : 'agendada';
}

export function montarEdicao(
  turma: Turma,
  jornada: JornadaCarregada,
): JornadaEdicao {
  const agora = new Date();
  let aulasAbertas = 0;
  let proxima: { aula_id: number; titulo: string; abre_em: Date } | null = null;
  const modulos = jornada.modulos.map(({ modulo, posicao, aulas }) => ({
    modulo_id: modulo.id,
    titulo: modulo.title,
    posicao,
    aulas: aulas.map((aula, index) => {
      const abreEm = jornada.aberturas.get(aula.id);
      const estado = estadoDaAula(abreEm, agora);
      if (estado === 'aberta') aulasAbertas += 1;
      if (
        abreEm &&
        estado === 'agendada' &&
        (!proxima || abreEm < proxima.abre_em)
      )
        proxima = { aula_id: aula.id, titulo: aula.title, abre_em: abreEm };
      return {
        aula_id: aula.id,
        titulo: aula.title,
        ordem: index + 1,
        estado,
        abre_em: abreEm?.toISOString() ?? null,
      };
    }),
  }));
  const proximaAbertura = proxima as {
    aula_id: number;
    titulo: string;
    abre_em: Date;
  } | null;
  return {
    turma: {
      id: turma.id,
      nome: turma.nome,
      ano_letivo: turma.ano_letivo,
      ativa: !!turma.ativa,
    },
    resumo: {
      aulasAbertas,
      proximaAbertura: proximaAbertura
        ? { ...proximaAbertura, abre_em: proximaAbertura.abre_em.toISOString() }
        : null,
    },
    modulos,
    catalogo: jornada.catalogo.map((modulo) => ({
      modulo_id: modulo.id,
      titulo: modulo.title,
    })),
  };
}
