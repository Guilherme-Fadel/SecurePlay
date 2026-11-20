import type { KeyboardEvent } from 'react';
import type { RankingEntry } from '@/services/dashboard';
import { toBoardEntry } from './boardModel';
import { canStep, hallStepLabel, stepEntry } from './hallModel';

export interface HallStep { id: string | null; enabled: boolean; label: string; go: () => void }

/** Anterior e próxima: nome acessível (quem sobe), limite da lista e atalho do teclado (← →). */
export function useHallSteps(entries: readonly RankingEntry[], current: string | null, active: boolean, onSelect: (id: string) => void) {
  const turmas = entries[0] ? toBoardEntry(entries[0]).kind === 'turma' : false;
  const build = (delta: -1 | 1): HallStep => {
    const enabled = active && canStep(entries, current, delta);
    const id = enabled ? stepEntry(entries, current, delta) : null;
    const name = entries.find((entry) => entry.rankKey === id)?.name ?? null;
    return { id, enabled, label: hallStepLabel(name, delta, turmas), go: () => { if (id) onSelect(id); } };
  };
  const prev = build(-1);
  const next = build(1);
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const step = event.key === 'ArrowLeft' ? prev : event.key === 'ArrowRight' ? next : null;
    if (!step) return;
    event.preventDefault();
    step.go();
  };
  return { prev, next, onKeyDown };
}
