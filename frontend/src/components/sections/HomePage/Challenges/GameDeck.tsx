import { memo, useEffect, useRef, type KeyboardEvent, type RefObject } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import type { TokenState } from '@/services/arcade';
import { AppButton } from '@/components/ui/buttons/AppButton';
import type { GameCardData } from './games';
import { GameDeckSlot } from './GameDeckCard';
import { GameDeckTable } from './GameDeckTable';
import { deckModeFor, poseFor } from './gameDeckLayout';
import { playButtonState, useElementWidth, useGameDeck } from './gameDeckState';
import { useDeckPointer } from './gameDeckPointer';

interface GameDeckProps {
  games: GameCardData[];
  tokens: TokenState | null;
  onPlay: (game: GameCardData) => void;
  initialSlug?: string | null;
  onFocusChange?: (slug: string) => void;
  /** Voltando de um jogo: devolve o foco ao botão de jogar da carta da frente. */
  focusOnMount?: boolean;
}

const KEY_STEPS: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1 };

/** Distribuição animada só na primeira montagem; nenhuma ao voltar de um jogo. */
function dealClassFor(deal: boolean, reduceMotion: boolean): string | null {
  return deal && !reduceMotion ? 'is-deal' : null;
}

/**
 * Voltando de um jogo, o baralho remonta: foca o botão de jogar da carta da
 * frente (ou a mão). Lê o valor só na montagem, por isso o ref guarda o inicial.
 */
function useReturnFocus(handRef: RefObject<HTMLDivElement | null>, focusOnMount: boolean | undefined) {
  const initial = useRef(focusOnMount === true);
  useEffect(() => {
    if (!initial.current) return;
    const target = handRef.current?.parentElement?.querySelector<HTMLElement>('[data-deck-controls] .dk-play') ?? handRef.current;
    target?.focus({ preventScroll: true });
  }, [handRef]);
}

/** Baralho de jogos: leque no desktop, pilha (com arraste) abaixo de 700 px. */
export const GameDeck = memo(function GameDeck({ games, tokens, onPlay, initialSlug, onFocusChange, focusOnMount }: GameDeckProps) {
  const reduceMotion = useReducedMotion() === true;
  const handRef = useRef<HTMLDivElement>(null);
  useReturnFocus(handRef, focusOnMount);
  const width = useElementWidth(handRef);
  const mode = deckModeFor(width);
  const deck = useGameDeck({ games, initialSlug, onFocusChange, onPlay, reduceMotion });
  const { index, total } = deck;
  const launching = deck.launching !== null;
  const multiple = total > 1;
  const { resetTilt, ...pointer } = useDeckPointer({
    handRef,
    tilt: !reduceMotion && !launching,
    swipe: mode === 'pile' && multiple && !launching,
    onSwipe: deck.go,
  });
  const current = games[index];
  if (!current) return null;
  const dealClass = dealClassFor(deck.deal, reduceMotion);

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = KEY_STEPS[event.key];
    if (step === undefined || !multiple) return;
    event.preventDefault();
    // O botão "Trazer … para frente" em foco pode sumir ao virar a carta da frente.
    if (event.target !== event.currentTarget) event.currentTarget.focus({ preventScroll: true });
    deck.go(step);
  };
  const pick = (next: number) => {
    deck.focusIndex(next);
    handRef.current?.focus({ preventScroll: true });
  };
  const play = () => {
    resetTilt();
    deck.play(current);
  };

  return (
    <GameDeckTable lead="Escolha uma carta e jogue.">
      <div
        ref={handRef}
        className={`dk-hand is-${mode}${multiple ? '' : ' is-single'}`}
        tabIndex={multiple ? 0 : undefined}
        role="group"
        aria-roledescription="baralho"
        aria-label={multiple ? 'Cartas de jogos. Use as setas esquerda e direita para escolher.' : 'Carta de jogo'}
        onKeyDown={onKeyDown}
        {...pointer}
      >
        {games.map((game, i) => (
          <GameDeckSlot
            key={game.id}
            game={game}
            index={i}
            total={total}
            pose={poseFor({ index: i, selected: index, total, mode, width })}
            front={i === index}
            dealClass={dealClass}
            launching={launching}
            onPick={pick}
          />
        ))}
        <span className={`dk-coin${launching ? ' is-dropping' : ''}`} aria-hidden="true" />
      </div>
      <GameDeckControls game={current} tokens={tokens} launching={launching} multiple={multiple} onPrev={() => deck.go(-1)} onNext={() => deck.go(1)} onPlay={play} />
      {mode === 'pile' && multiple && <GameDeckDots games={games} index={index} disabled={launching} onSelect={deck.focusIndex} />}
      <p className="dk-count" aria-live="polite" aria-atomic="true">Carta {index + 1} de {total}: {current.title}</p>
    </GameDeckTable>
  );
});

interface GameDeckDotsProps {
  games: GameCardData[];
  index: number;
  disabled: boolean;
  onSelect: (index: number) => void;
}

/** Posição na pilha (pedido de 06/10): um botão por carta, a atual com `aria-current`. */
function GameDeckDots({ games, index, disabled, onSelect }: GameDeckDotsProps) {
  return (
    <div className="dk-dots" role="group" aria-label="Escolher carta">
      {games.map((game, i) => (
        <button key={game.id} type="button" aria-label={`Ir para ${game.title}`} aria-current={i === index ? 'true' : undefined} disabled={disabled} onClick={() => onSelect(i)} />
      ))}
    </div>
  );
}

interface GameDeckControlsProps {
  game: GameCardData;
  tokens: TokenState | null;
  launching: boolean;
  multiple: boolean;
  onPrev: () => void;
  onNext: () => void;
  onPlay: () => void;
}

/** Anterior/próxima e o único botão de jogar, sempre ligado à carta da frente. */
function GameDeckControls({ game, tokens, launching, multiple, onPrev, onNext, onPlay }: GameDeckControlsProps) {
  const state = playButtonState(game, tokens, launching);
  const accessibleName = `${state.label}: ${game.title}${state.showCost ? ', 1 ficha' : ''}`;
  return (
    <div className={`dk-ctrl${multiple ? '' : ' is-single'}`} data-deck-controls="">
      {multiple && (
        <button type="button" className="dk-icbtn" aria-label="Carta anterior" onClick={onPrev} disabled={launching}>
          <ChevronLeft size={22} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}
      {multiple && <span className="dk-spacer" aria-hidden="true" />}
      <AppButton
        variant="chunky"
        tone="yellow"
        className="dk-play"
        icon={state.disabled ? undefined : <Play size={18} fill="currentColor" aria-hidden="true" />}
        disabled={state.disabled}
        aria-disabled={state.busy || undefined}
        onClick={onPlay}
        aria-label={accessibleName}
      >
        {state.label}
        {state.showCost && <small> · 1 ficha</small>}
      </AppButton>
      {multiple && (
        <button type="button" className="dk-icbtn" aria-label="Próxima carta" onClick={onNext} disabled={launching}>
          <ChevronRight size={22} strokeWidth={2.6} aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
