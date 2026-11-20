import { useCallback, useState } from 'react';

/**
 * Quem está em destaque no palco. A escolha vale só para a cena em que foi feita: ao trocar
 * escopo, período ou temporada, o destaque volta ao 1º colocado. É o estado que o placar
 * e as setas do palco compartilham (montado em `RankingArea`).
 */
export function useHallSelection(sceneKey: string) {
  const [pick, setPick] = useState<{ sceneKey: string; id: string } | null>(null);
  const select = useCallback((id: string) => setPick({ sceneKey, id }), [sceneKey]);
  return { selectedId: pick && pick.sceneKey === sceneKey ? pick.id : null, select };
}
