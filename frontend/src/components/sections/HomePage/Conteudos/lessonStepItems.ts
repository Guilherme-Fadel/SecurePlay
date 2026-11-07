import type { LessonStepItem } from './LessonStepper';

interface PagedLessonState {
  labels: string[];
  currentPage: number;
  showQuiz: boolean;
  completed: boolean;
  hasQuiz: boolean;
  /** Quiz liberado quando o aluno já chegou à última página e a aula não foi concluída. */
  quizReachable: boolean;
  onPage: (index: number) => void;
  onQuiz: () => void;
  /** Quadrinho: etapa final "Concluir" (só indicativa). */
  withDone?: boolean;
}

/** Etapas de aula paginada: páginas, Quiz (se houver perguntas) e, opcionalmente, Concluir. */
export function pagedStepItems(state: PagedLessonState): LessonStepItem[] {
  const { labels, currentPage, showQuiz, completed, hasQuiz, quizReachable, onPage, onQuiz, withDone = false } = state;
  const items: LessonStepItem[] = labels.map((label, index) => ({
    key: `page-${index}`,
    label,
    status: !showQuiz && index === currentPage ? 'current' : completed || showQuiz || index < currentPage ? 'done' : 'next',
    onSelect: () => onPage(index),
  }));
  if (hasQuiz) {
    items.push({ key: 'quiz', label: 'Quiz', status: showQuiz ? 'current' : completed ? 'done' : 'next', onSelect: quizReachable ? onQuiz : undefined });
  }
  if (withDone) items.push({ key: 'done', label: 'Concluir', status: completed ? 'done' : 'next' });
  return items;
}

export type LessonNextAction = 'next' | 'quiz' | 'complete' | 'leave';

/** Ação do botão principal na última página: avançar, abrir o quiz, concluir sem quiz ou seguir na trilha. */
export function lessonNextAction(atEnd: boolean, hasQuiz: boolean, completed: boolean): LessonNextAction {
  if (!atEnd) return 'next';
  if (completed) return 'leave';
  return hasQuiz ? 'quiz' : 'complete';
}

export const NEXT_LABEL: Record<LessonNextAction, string> = {
  next: 'Próxima etapa',
  quiz: 'Ir para o quiz',
  complete: 'Concluir leitura',
  leave: 'Seguir na trilha',
};

export const readerPercent = (completed: boolean, currentPage: number, total: number) =>
  completed ? 100 : total ? Math.round(((currentPage + 1) / total) * 100) : 0;
