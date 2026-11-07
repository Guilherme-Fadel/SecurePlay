import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { HostSpeech } from './rankingModel';

const STREAK_WINDOW_MS = 900;
const DIZZY_AFTER = 5;

interface HostState {
  touches: number;
  line: number;
  streak: number;
  last: number;
  mood: 'idle' | 'happy' | 'dizzy';
  /** Reação do último toque; fica fixa ao voltar ao repouso para a animação não repetir. */
  reaction: 'jump' | 'spin';
  /** Fala congelada no toque: atualizações dos dados não reanunciam nada sem ação do aluno. */
  said: string | null;
}

const INITIAL: HostState = { touches: 0, line: 0, streak: 0, last: 0, mood: 'idle', reaction: 'jump', said: null };
const DIZZY_LINE = 'Ei, assim eu fico tonto!';

/** Fala do toque: tonto ou a próxima linha da lista, na ordem. */
function lineFor(dizzy: boolean, line: number, { lines, idle }: HostSpeech): string {
  if (dizzy) return DIZZY_LINE;
  return lines.length > 0 ? lines[(line - 1 + lines.length) % lines.length] ?? idle : idle;
}

function hostView(state: HostState, { idle }: HostSpeech, reduceMotion: boolean) {
  const talking = state.touches > 0;
  const side = state.touches % 2 ? 'a' : 'b';
  const animate = talking && !reduceMotion;
  return {
    say: state.said ?? idle,
    side,
    animate,
    burst: animate && state.reaction === 'jump',
    motionClass: animate ? ` is-${state.reaction}-${side}` : '',
    expression: state.mood === 'dizzy' ? 'startled' as const : state.mood === 'happy' ? 'happy' as const : 'open' as const,
  };
}

/**
 * Pet anfitrião da faixa da temporada. Cada toque (clique, Enter ou Espaço)
 * troca a fala e dá um pulo com confete; cinco toques seguidos o deixam tonto.
 * Sem listeners globais de ponteiro; com movimento reduzido, só a fala muda.
 */
export function RankingHost({ speech }: { speech: HostSpeech }) {
  const reduceMotion = useReducedMotion() === true;
  const [state, setState] = useState<HostState>(INITIAL);
  const timer = useRef<number | undefined>(undefined);
  const speechRef = useRef(speech);
  speechRef.current = speech;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const poke = () => {
    const now = Date.now();
    setState((current) => {
      const streak = now - current.last < STREAK_WINDOW_MS ? current.streak + 1 : 1;
      const dizzy = streak >= DIZZY_AFTER;
      const line = dizzy ? current.line : current.line + 1;
      return {
        said: lineFor(dizzy, line, speechRef.current),
        touches: current.touches + 1,
        line,
        streak: dizzy ? 0 : streak,
        last: now,
        mood: dizzy ? 'dizzy' : 'happy',
        reaction: dizzy ? 'spin' : 'jump',
      };
    });
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setState((current) => ({ ...current, mood: 'idle' })), 1600);
  };

  const view = hostView(state, speech, reduceMotion);
  return (
    <div className="rk-host">
      <p className={`rk-say${state.touches > 0 ? ' is-talking' : ''}${view.animate ? ` is-pop-${view.side}` : ''}`}>{view.say}</p>
      {/* Só a fala do toque é anunciada; a de repouso muda com os dados e não deve interromper. */}
      <span className="sr-only" role="status" aria-live="polite">{state.said ?? ''}</span>
      <button type="button" className={`rk-host-btn is-${state.mood}`} onClick={poke} aria-label="Cutucar o mascote da turma">
        {view.burst && <span className={`rk-burst is-${view.side}`} aria-hidden="true">{Array.from({ length: 8 }, (_, index) => <i key={index} />)}</span>}
        <span className={`rk-host-body${view.motionClass}`}>
          <BrandCharacter
            body="var(--sp-cream)"
            face="var(--sp-blue)"
            eyes="var(--sp-cream)"
            expression={view.expression}
            faceRotation={state.mood === 'dizzy' ? -12 : 0}
            blink={!reduceMotion}
            float={!reduceMotion}
          />
        </span>
      </button>
    </div>
  );
}
