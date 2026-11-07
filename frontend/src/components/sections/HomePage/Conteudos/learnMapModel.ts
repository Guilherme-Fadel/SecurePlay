import type { PebbleState } from '@/components/ui/visuals/Pebble';
import type { Modulo, ProximaAula } from '@/services/conteudo';

export type TerritoryIndex = 0 | 1 | 2;

export interface LearnModule {
  modulo: Modulo;
  /** Posição na trilha inteira (1-based): "Módulo N". */
  number: number;
  territory: TerritoryIndex;
  /** Estado da parada; bloqueio e conclusão vêm do backend. */
  state: PebbleState;
  started: boolean;
}

export interface LearnTerritory {
  index: TerritoryIndex;
  level: string;
  title: string;
  description: string;
  /** Cor fixa da marca (segmento, personagem e faixa do mapa). */
  color: string;
  face: string;
  modules: LearnModule[];
  completedModules: number;
  totalLessons: number;
  completedLessons: number;
  /** Todos os módulos do território bloqueados. */
  locked: boolean;
}

export interface LearnJourney {
  modules: LearnModule[];
  territories: LearnTerritory[];
  /** Módulo atual (o da jornada) quando ainda há o que estudar nele. */
  current: LearnModule | null;
  complete: boolean;
  anyStarted: boolean;
}

/** Fácil/Médio/Difícil = Bosque/Vale/Cidadela (mesmos nomes da jornada no backend). */
const TERRITORIES: ReadonlyArray<Omit<LearnTerritory, 'modules' | 'completedModules' | 'totalLessons' | 'completedLessons' | 'locked'>> = [
  { index: 0, level: 'Fácil', title: 'Bosque dos Fundamentos', description: 'Aprenda os primeiros poderes para explorar a internet com segurança.', color: 'var(--sp-yellow)', face: 'var(--sp-black)' },
  { index: 1, level: 'Médio', title: 'Vale dos Guardiões', description: 'Use o que você aprendeu para resolver missões mais desafiadoras.', color: 'var(--sp-pink)', face: 'var(--sp-black)' },
  { index: 2, level: 'Difícil', title: 'Cidadela Digital', description: 'Enfrente os desafios finais e torne-se um guardião digital.', color: 'var(--sp-blue)', face: 'var(--sp-cream)' },
];

const TERRITORY_OF: Record<Modulo['difficulty'], TerritoryIndex> = { iniciante: 0, intermediario: 1, avancado: 2 };

export const territoryOf = (modulo: Pick<Modulo, 'difficulty'>): TerritoryIndex => TERRITORY_OF[modulo.difficulty] ?? 0;

/** Nome do território do módulo (usado também pelas telas de aula). */
export const territoryTitle = (modulo: Pick<Modulo, 'difficulty'>): string | null =>
  TERRITORIES[territoryOf(modulo)]?.title ?? null;

const isDone = (modulo: Modulo) => modulo.progress >= 100 || (modulo.totalAulas > 0 && modulo.completedAulas >= modulo.totalAulas);
const isStarted = (modulo: Modulo) => modulo.hasStarted || modulo.completedAulas > 0 || modulo.progress > 0;
const isOpenToStudy = (modulo: Modulo) => modulo.locked !== true && !isDone(modulo);

/**
 * Módulo atual: o `currentModuleId` da jornada (mesma regra do Início).
 * Só sem a jornada (falha da requisição) cai para o primeiro iniciado e
 * depois o primeiro liberado, que é a ordem que o backend usa.
 */
function resolveCurrentId(ordered: Modulo[], currentModuleId: number | null | undefined): number | null {
  const fromJourney = currentModuleId === undefined ? undefined : ordered.find((modulo) => modulo.id === currentModuleId);
  if (fromJourney && isOpenToStudy(fromJourney)) return fromJourney.id;
  const open = ordered.filter(isOpenToStudy);
  return (open.find(isStarted) ?? open[0])?.id ?? null;
}

/**
 * "Módulo N" = posição na ordem devolvida pela API (a mesma do `globalPosition`
 * da jornada no backend). Mapa, Início e página do módulo usam esta fonte.
 */
export function moduleNumberOf(modulos: readonly Pick<Modulo, 'id'>[] | null | undefined, moduloId: number): number | null {
  const index = modulos?.findIndex((modulo) => modulo.id === moduloId) ?? -1;
  return index >= 0 ? index + 1 : null;
}

export function buildLearnJourney(modulos: Modulo[], currentModuleId: number | null | undefined): LearnJourney {
  // Ordem da jornada: território e, dentro dele, a ordem devolvida pela API.
  const ordered = modulos
    .map((modulo, position) => ({ modulo, position }))
    .sort((a, b) => territoryOf(a.modulo) - territoryOf(b.modulo) || a.position - b.position);
  const currentId = resolveCurrentId(ordered.map((item) => item.modulo), currentModuleId);
  const modules: LearnModule[] = ordered.map(({ modulo, position }) => ({
    modulo,
    number: position + 1,
    territory: territoryOf(modulo),
    started: isStarted(modulo),
    state: modulo.locked === true ? 'locked' : isDone(modulo) ? 'done' : modulo.id === currentId ? 'here' : 'next',
  }));
  const territories = TERRITORIES.map((base) => {
    const own = modules.filter((item) => item.territory === base.index);
    return {
      ...base,
      modules: own,
      completedModules: own.filter((item) => item.state === 'done').length,
      totalLessons: own.reduce((sum, item) => sum + item.modulo.totalAulas, 0),
      completedLessons: own.reduce((sum, item) => sum + item.modulo.completedAulas, 0),
      locked: own.length > 0 && own.every((item) => item.state === 'locked'),
    };
  });
  return {
    modules,
    territories,
    current: modules.find((item) => item.modulo.id === currentId) ?? null,
    complete: modules.length > 0 && modules.every((item) => item.state === 'done'),
    anyStarted: modules.some((item) => item.started),
  };
}

const LESSON_TYPES: Record<ProximaAula['type'] | Modulo['type'], string> = {
  texto: 'Leitura',
  video: 'Vídeo',
  quadrinho: 'Quadrinho',
  misto: 'Misto',
};

export const typeLabel = (type: ProximaAula['type'] | Modulo['type']) => LESSON_TYPES[type] ?? 'Aula';

export const formatNumber = (value: number) => value.toLocaleString('pt-BR');

export const percentOf = (done: number, total: number) => (total > 0 ? Math.min(100, Math.round((done / total) * 100)) : 0);

/** Rótulo da ação de um módulo liberado. */
export function moduleCta(item: LearnModule): string {
  if (item.state === 'done') return 'Rever';
  return item.started ? 'Continuar' : 'Começar';
}
