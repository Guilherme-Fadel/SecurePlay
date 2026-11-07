import type { AulaDetalhes, AulaResumo, ModuloDetalhes } from '@/services/conteudo';
import { sortAulasByModuleSequence } from '@/lib/lessonOrder';

export type LessonType = AulaDetalhes['type'];

export const LESSON_TYPE_LABEL: Record<LessonType, string> = { texto: 'Leitura', quadrinho: 'Quadrinho', video: 'Vídeo' };

export interface LessonPosition {
  /** 1-based na sequência do módulo; null enquanto o módulo não carregou. */
  number: number | null;
  total: number;
  previous: AulaResumo | null;
  current: AulaResumo | null;
  next: AulaResumo | null;
}

export function lessonPosition(modulo: ModuloDetalhes | null, aulaId: number): LessonPosition {
  const ordered = modulo ? sortAulasByModuleSequence(modulo.aulas) : [];
  const index = ordered.findIndex((aula) => aula.id === aulaId);
  if (index < 0) return { number: null, total: ordered.length, previous: null, current: null, next: null };
  return {
    number: index + 1,
    total: ordered.length,
    previous: ordered[index - 1] ?? null,
    current: ordered[index] ?? null,
    next: ordered[index + 1] ?? null,
  };
}

/** Segundos em m:ss (h:mm:ss acima de uma hora). */
export function formatClock(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(totalSeconds) ? totalSeconds : 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = String(safe % 60).padStart(2, '0');
  return hours ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}

export const formatXp = (value: number) => value.toLocaleString('pt-BR');
