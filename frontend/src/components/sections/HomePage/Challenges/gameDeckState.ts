import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import type { TokenState } from '@/services/arcade';
import { spendsToken, type GameCardData } from './games';
import { wrapIndex } from './gameDeckLayout';

/** Duração da ficha caindo antes de abrir o jogo (≤ 700 ms). */
export const COIN_DROP_MS = 650;

/** Largura do elemento, atualizada pelo ResizeObserver (ignora variações < 5 px). */
export function useElementWidth(ref: RefObject<HTMLElement | null>): number {
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = (next: number) => setWidth((prev) => (Math.abs(prev - next) > 4 ? Math.round(next) : prev));
    update(el.getBoundingClientRect().width);
    if (typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) update(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [ref]);
  return width;
}

interface UseGameDeckOptions {
  games: GameCardData[];
  initialSlug?: string | null;
  onFocusChange?: (slug: string) => void;
  onPlay: (game: GameCardData) => void;
  reduceMotion: boolean;
}

/**
 * Carta em foco (guardada pelo slug, para sobreviver a refetch e à volta de um
 * jogo), distribuição inicial e lançamento com a ficha caindo. O débito real
 * continua no `start` do jogo; aqui só a transição visual.
 */
export function useGameDeck({ games, initialSlug, onFocusChange, onPlay, reduceMotion }: UseGameDeckOptions) {
  const total = games.length;
  const [selectedSlug, setSelectedSlug] = useState<string | null>(initialSlug ?? null);
  const found = games.findIndex((game) => game.id === selectedSlug);
  const index = found >= 0 ? found : 0;
  /** Distribui as cartas uma vez ao montar; voltando de um jogo (com carta escolhida), não. */
  const [deal] = useState(!initialSlug);
  const [launching, setLaunching] = useState<string | null>(null);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  const focusIndex = useCallback((next: number) => {
    if (launching) return;
    const game = games[wrapIndex(next, total)];
    if (!game) return;
    setSelectedSlug(game.id);
    onFocusChange?.(game.id);
  }, [games, launching, onFocusChange, total]);

  const go = useCallback((delta: number) => focusIndex(index + delta), [focusIndex, index]);

  const play = useCallback((game: GameCardData) => {
    if (launching || game.status === 'SOON') return;
    if (reduceMotion || !spendsToken(game)) {
      onPlay(game);
      return;
    }
    setLaunching(game.id);
    timer.current = window.setTimeout(() => {
      setLaunching(null);
      onPlay(game);
    }, COIN_DROP_MS);
  }, [launching, onPlay, reduceMotion]);

  return { index, total, deal, launching, focusIndex, go, play };
}

export interface PlayButtonState {
  label: string;
  /** Mostra "· 1 ficha" (jogos que consomem ficha). */
  showCost: boolean;
  disabled: boolean;
  /**
   * Lançando (ficha caindo): o botão segue focável com `aria-disabled`, para o
   * foco não cair no body; o `play()` já ignora cliques durante o lançamento.
   */
  busy: boolean;
}

/** Rótulo do botão da carta em foco. Sem saldo conhecido, o backend decide no `start`. */
export function playButtonState(game: GameCardData, tokens: TokenState | null, launching: boolean): PlayButtonState {
  if (game.status === 'SOON') return { label: 'Em breve', showCost: false, disabled: true, busy: false };
  if (launching) return { label: 'Abrindo…', showCost: false, disabled: false, busy: true };
  if (!spendsToken(game)) return { label: 'Jogar esta carta', showCost: false, disabled: false, busy: false };
  if (tokens && tokens.balance <= 0) return { label: 'Sem fichas', showCost: false, disabled: true, busy: false };
  return { label: 'Jogar esta carta', showCost: true, disabled: false, busy: false };
}
