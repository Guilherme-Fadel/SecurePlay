import { useCallback, useState } from 'react';
import type { RankingEntry } from '@/services/dashboard';
import { selectedEntry } from './hallModel';
import { clampScoreboardPage, resolveScoreboardPage, scoreboardPageCount, type ScoreboardPick } from './scoreboardModel';

/**
 * Página do placar: segue o aluno em destaque (setas do palco, clique, "Ver no palco") e a cena,
 * e deixa o aluno folhear à mão sem voltar sozinha. Sem efeito: a página é derivada no render.
 */
export function useScoreboardPage(entries: readonly RankingEntry[], selectedId: string | null, sceneKey: string) {
  const [pick, setPick] = useState<ScoreboardPick | null>(null);
  const focusId = selectedEntry(entries, selectedId)?.rankKey ?? null;
  const anchor = `${sceneKey}|${focusId ?? ''}`;
  const page = resolveScoreboardPage(entries, focusId, pick, anchor);
  const pages = scoreboardPageCount(entries.length);
  const go = useCallback((delta: -1 | 1) => {
    setPick({ anchor, page: clampScoreboardPage(page + delta, entries.length) });
  }, [anchor, page, entries.length]);
  return { page, pages, go };
}
