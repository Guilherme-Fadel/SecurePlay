import type { AulaResumo, ModuloDetalhes } from '@/services/conteudo';
import { groupAulasBySections, sortAulasByModuleSequence } from '@/lib/lessonOrder';
import { territoryTitle } from './learnMapModel';

/** Estado visual do capítulo; deriva só do status que o backend envia por aula. */
export type ModuleChapterState = 'done' | 'current' | 'progress' | 'locked';

export interface ModuleLesson {
  aula: AulaResumo;
  /** Posição 1-based na sequência do módulo. */
  number: number;
  isNext: boolean;
}

export interface ModuleChapter {
  number: number;
  title: string;
  lessons: ModuleLesson[];
  done: number;
  total: number;
  state: ModuleChapterState;
}

export interface ModulePageData {
  lessons: ModuleLesson[];
  chapters: ModuleChapter[];
  next: ModuleLesson | null;
  completed: number;
  total: number;
  /** Já houve conclusão ou progresso salvo na próxima aula. */
  started: boolean;
  finished: boolean;
  typesLabel: string;
  levelLabel: string;
  territory: string;
}

const LEVELS: Record<ModuloDetalhes['difficulty'], string> = {
  iniciante: 'Fácil',
  intermediario: 'Médio',
  avancado: 'Difícil',
};

export const LESSON_TYPE_LABEL: Record<AulaResumo['type'], string> = {
  video: 'Vídeo',
  quadrinho: 'Quadrinho',
  texto: 'Leitura',
};

function joinPt(items: string[]): string {
  if (items.length <= 1) return items.join('');
  return `${items.slice(0, -1).join(', ')} e ${items[items.length - 1]}`;
}

function chapterState(lessons: ModuleLesson[], done: number): ModuleChapterState {
  if (lessons.length > 0 && done === lessons.length) return 'done';
  if (lessons.some((lesson) => lesson.isNext)) return 'current';
  if (lessons.some((lesson) => lesson.aula.status !== 'locked')) return 'progress';
  return 'locked';
}

/** Agrupa as aulas por capítulo (section_name) na ordem do módulo e localiza a próxima aula liberada. */
export function buildModulePage(modulo: ModuloDetalhes): ModulePageData {
  const ordered = sortAulasByModuleSequence(modulo.aulas);
  const nextAula = ordered.find((aula) => aula.status === 'unlocked') ?? null;
  const numbers = new Map(ordered.map((aula, index) => [aula.id, index + 1]));
  const toLesson = (aula: AulaResumo): ModuleLesson => ({
    aula,
    number: numbers.get(aula.id) ?? 0,
    isNext: aula.id === nextAula?.id,
  });
  const lessons = ordered.map(toLesson);
  const chapters = groupAulasBySections(ordered).map((section, index): ModuleChapter => {
    const chapterLessons = section.aulas.map(toLesson);
    const done = chapterLessons.filter((lesson) => lesson.aula.status === 'completed').length;
    return {
      number: index + 1,
      title: section.name || 'Aulas do módulo',
      lessons: chapterLessons,
      done,
      total: chapterLessons.length,
      state: chapterState(chapterLessons, done),
    };
  });
  const completed = lessons.filter((lesson) => lesson.aula.status === 'completed').length;
  const next = lessons.find((lesson) => lesson.isNext) ?? null;
  const types = Array.from(new Set(ordered.map((aula) => aula.type)), (type) => LESSON_TYPE_LABEL[type].toLowerCase());
  // Dificuldade fora do contrato (dado antigo) cai na categoria em vez de quebrar.
  const level: string | undefined = LEVELS[modulo.difficulty];
  return {
    lessons,
    chapters,
    next,
    completed,
    total: lessons.length,
    started: completed > 0 || (next?.aula.progress_percent ?? 0) > 0,
    finished: lessons.length > 0 && completed === lessons.length,
    typesLabel: joinPt(types),
    levelLabel: level ? `Nível ${level}` : modulo.category,
    territory: (level ? territoryTitle(modulo) : null) ?? modulo.category,
  };
}

/**
 * Capítulo aberto ao entrar no módulo: o da próxima aula; sem ela, o primeiro
 * ainda em andamento; senão, o primeiro.
 */
export function initialChapterIndex(page: Pick<ModulePageData, 'chapters'>): number {
  const withNext = page.chapters.findIndex((chapter) => chapter.state === 'current');
  if (withNext >= 0) return withNext;
  const inProgress = page.chapters.findIndex((chapter) => chapter.state === 'progress');
  return inProgress >= 0 ? inProgress : 0;
}

export const formatModuleNumber = (value: number) => value.toLocaleString('pt-BR');
