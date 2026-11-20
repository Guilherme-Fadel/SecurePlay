import { useEffect, useRef } from 'react';
import type { RankingEntry } from '@/services/dashboard';

export interface HallSnapshot { sceneKey: string; entries: RankingEntry[]; selectedId: string | null }

/**
 * O que o palco mostra. Quando a cena muda, o palco segue com a anterior enquanto a cortina
 * fecha; a nova só aparece quando a cortina a revela (`shownKey` alcança `live.sceneKey`).
 */
export function useHallView(live: HallSnapshot, shownKey: string): HallSnapshot {
  const shown = useRef(live);
  useEffect(() => { if (live.sceneKey === shownKey) shown.current = live; });
  return live.sceneKey === shownKey ? live : shown.current;
}
