import { Modulo } from './modulo.entity';
import { Aula } from '../aula/aula.entity';
import { UsuarioAula } from '../usuario-aula/usuario-aula.entity';
import { JornadaDaTurma } from '../../turma/jornada-turma.service';
import {
  EstadoAula,
  LockReason,
  ModuloRef,
  resolverEstadoJornada,
} from '../../turma/jornada-regras';

/** Catálogo ativo, progresso do aluno e, se houver, a jornada da turma dele. */
export interface CargaJornada {
  modulos: Modulo[];
  aulasByModulo: Map<number, Aula[]>;
  progressByAula: Map<number, UsuarioAula>;
  jornada: JornadaDaTurma | null;
}

type Situacao = { locked: boolean; outsideJourney: boolean };

/** Assets padronizados são resolvidos no frontend pelo título/chave do módulo. */
export function resolverThumbnail(source: string | null): string | null {
  const normalized = source?.trim();
  if (!normalized || normalized.startsWith('s3://')) return null;
  return normalized;
}

function ultimoAcesso(rows: UsuarioAula[]): Date | null {
  return rows.reduce<Date | null>((latest, row) => {
    if (!row.last_accessed_at) return latest;
    return !latest || row.last_accessed_at > latest
      ? row.last_accessed_at
      : latest;
  }, null);
}

/** Aula concluída mais recente do módulo, para "Revisar a última aula". */
function ultimaConcluida(aulas: Aula[], carga: CargaJornada): number | null {
  let escolhida: { id: number; quando: number } | null = null;
  aulas.forEach((aula, index) => {
    const row = carga.progressByAula.get(aula.id);
    if (!row?.completed) return;
    // Sem data, vale a posição na sequência (concluídas antigas sem completed_at).
    const quando = row.completed_at
      ? new Date(row.completed_at).getTime()
      : index - aulas.length;
    if (!escolhida || quando >= escolhida.quando)
      escolhida = { id: aula.id, quando };
  });
  return (escolhida as { id: number } | null)?.id ?? null;
}

function proximaAula(
  aulas: Aula[],
  aula: Aula | undefined,
  lockReason: LockReason | null,
  estado: EstadoAula | undefined,
) {
  if (!aula) return null;
  return {
    id: aula.id,
    title: aula.title,
    type: aula.type,
    xp: aula.xp,
    duration: aula.duration,
    section_name: aula.section_name ?? null,
    position: aulas.indexOf(aula) + 1,
    lock_reason: lockReason,
    opens_at: estado?.opensAt?.toISOString() ?? null,
  };
}

function resumirModulo(
  modulo: Modulo,
  carga: CargaJornada,
  situacao: Situacao,
  estados: Map<number, EstadoAula> | null,
) {
  const aulas = carga.aulasByModulo.get(modulo.id) ?? [];
  const progresso = aulas
    .map((aula) => carga.progressByAula.get(aula.id))
    .filter((row): row is UsuarioAula => Boolean(row));
  const completedAulas = progresso.filter((row) => row.completed).length;
  const totalAulas = aulas.length;
  const next = aulas.find(
    (aula) => !carga.progressByAula.get(aula.id)?.completed,
  );
  const estadoNext = next ? estados?.get(next.id) : undefined;
  const legadoReason: LockReason | null = situacao.locked ? 'sequence' : null;
  const nextReason = estados ? (estadoNext?.lockReason ?? null) : legadoReason;
  const thumbnail = resolverThumbnail(modulo.thumbnail);
  return {
    ...modulo,
    thumbnail,
    artworkUrl: thumbnail,
    totalAulas,
    completedAulas,
    progress:
      totalAulas > 0 ? Math.round((completedAulas / totalAulas) * 100) : 0,
    hasStarted: progresso.length > 0,
    lastAccessedAt: ultimoAcesso(progresso),
    nextAulaId: next?.id ?? null,
    // B1: detalhe da proxima aula para o "Continue de onde parou" sem request extra.
    nextAula: proximaAula(aulas, next, nextReason, estadoNext),
    locked: situacao.locked,
    outside_journey: situacao.outsideJourney,
    lastCompletedAulaId: ultimaConcluida(aulas, carga),
  };
}

export type ModuloListado = ReturnType<typeof resumirModulo>;

function listarGlobal(carga: CargaJornada): ModuloListado[] {
  // Cada trilha progride separadamente; a trilha principal preserva a ordem legada.
  const completedByPath = new Map<string, boolean>();
  return carga.modulos.map((modulo) => {
    const aulas = carga.aulasByModulo.get(modulo.id) ?? [];
    const hasStarted = aulas.some((aula) => carga.progressByAula.has(aula.id));
    const concluidas = aulas.filter(
      (aula) => carga.progressByAula.get(aula.id)?.completed,
    ).length;
    const path = modulo.learning_path || 'principal';
    const previousModuloCompleted = completedByPath.get(path) ?? true;
    // um modulo sem aulas ativas nao trava a cadeia
    completedByPath.set(
      path,
      previousModuloCompleted && concluidas === aulas.length,
    );
    // O que o aluno já começou nunca volta a bloquear (ex.: saiu de uma turma).
    const locked = !previousModuloCompleted && !hasStarted;
    return resumirModulo(
      modulo,
      carga,
      { locked, outsideJourney: false },
      null,
    );
  });
}

function listarDaTurma(carga: CargaJornada, jornada: JornadaDaTurma) {
  const ativos = new Map(carga.modulos.map((modulo) => [modulo.id, modulo]));
  const naJornada = jornada.moduloIds.filter((id) => ativos.has(id));
  const idsNaJornada = new Set(naJornada);
  const ref = (modulo: Modulo): ModuloRef => ({
    id: modulo.id,
    aulas: (carga.aulasByModulo.get(modulo.id) ?? []).map((aula) => ({
      id: aula.id,
      modulo_id: aula.modulo_id,
      titulo: aula.title,
    })),
  });
  const foraDaJornada = carga.modulos.filter(
    (modulo) =>
      !idsNaJornada.has(modulo.id) &&
      (carga.aulasByModulo.get(modulo.id) ?? []).some((aula) =>
        carga.progressByAula.has(aula.id),
      ),
  );
  const estadosModulos = resolverEstadoJornada({
    modulos: naJornada.map((id) => ref(ativos.get(id)!)),
    foraDaJornada: foraDaJornada.map(ref),
    aberturas: jornada.aberturas,
    progresso: new Map(
      [...carga.progressByAula].map(([aulaId, row]) => [
        aulaId,
        { completed: !!row.completed },
      ]),
    ),
    agora: new Date(),
  });
  const estados = new Map(
    estadosModulos.flatMap((modulo) =>
      modulo.aulas.map((aula) => [aula.aulaId, aula] as const),
    ),
  );
  const modulos = estadosModulos.map((estado) =>
    resumirModulo(ativos.get(estado.moduloId)!, carga, estado, estados),
  );
  return { modulos, estados };
}

/** Módulos na ordem efetiva do aluno; `estados` só existe para aluno com turma. */
export function listarModulos(carga: CargaJornada): {
  modulos: ModuloListado[];
  estados: Map<number, EstadoAula> | null;
} {
  if (!carga.jornada) return { modulos: listarGlobal(carga), estados: null };
  return listarDaTurma(carga, carga.jornada);
}

const STAGE_NAMES: Record<string, string> = {
  iniciante: 'Bosque dos Fundamentos',
  intermediario: 'Vale dos Guardiões',
  avancado: 'Cidadela Digital',
};
const STAGE_THEMES: Record<string, string> = {
  iniciante: 'meadow',
  intermediario: 'valley',
  avancado: 'citadel',
};

/** Território, nós e totais do mapa da jornada (Início e Aprender). */
export function resumoDaJornada(modules: ModuloListado[]) {
  const incomplete = modules.filter(
    (modulo) => modulo.progress < 100 && !modulo.locked,
  );
  const current =
    [...incomplete]
      .filter((modulo) => modulo.hasStarted)
      .sort((a, b) => {
        const dateDifference =
          (Date.parse(String(b.lastAccessedAt ?? '')) || 0) -
          (Date.parse(String(a.lastAccessedAt ?? '')) || 0);
        return dateDifference || a.order - b.order || a.id - b.id;
      })[0] ??
    incomplete[0] ??
    modules.at(-1) ??
    null;

  const stages = new Map<
    string,
    {
      key: string;
      title: string;
      order: number;
      theme: string;
      artworkUrl: string | null;
      nodes: Array<Record<string, unknown>>;
    }
  >();

  modules.forEach((modulo, globalIndex) => {
    const key = String(modulo.difficulty || 'jornada');
    if (!stages.has(key)) {
      stages.set(key, {
        key,
        title: STAGE_NAMES[key] ?? modulo.category ?? 'Nova etapa',
        order: stages.size,
        theme: STAGE_THEMES[key] ?? 'default',
        artworkUrl: null,
        nodes: [],
      });
    }
    stages.get(key)!.nodes.push({
      id: modulo.id,
      order: modulo.order,
      globalPosition: globalIndex + 1,
      title: modulo.title,
      progress: modulo.progress,
      totalAulas: modulo.totalAulas,
      completedAulas: modulo.completedAulas,
      hasStarted: modulo.hasStarted,
      lastAccessedAt: modulo.lastAccessedAt,
      artworkUrl: modulo.artworkUrl,
      nextAulaId: modulo.nextAulaId,
      xpTotal: modulo.xp_total,
      xpBonus: modulo.xp_bonus,
      locked: modulo.locked,
      availability: modulo.locked ? 'locked' : 'available',
      outsideJourney: modulo.outside_journey ?? false,
      nextLessonLockReason: modulo.nextAula?.lock_reason ?? null,
      nextLessonOpensAt: modulo.nextAula?.opens_at ?? null,
      lastCompletedAulaId: modulo.lastCompletedAulaId ?? null,
    });
  });

  const totalLessons = modules.reduce(
    (sum, modulo) => sum + modulo.totalAulas,
    0,
  );
  const completedLessons = modules.reduce(
    (sum, modulo) => sum + modulo.completedAulas,
    0,
  );

  return {
    summary: {
      totalModules: modules.length,
      completedModules: modules.filter((modulo) => modulo.progress === 100)
        .length,
      totalLessons,
      completedLessons,
      progressPercent:
        totalLessons > 0
          ? Math.round((completedLessons / totalLessons) * 100)
          : 0,
    },
    currentModuleId: current?.id ?? null,
    stages: Array.from(stages.values()),
  };
}
