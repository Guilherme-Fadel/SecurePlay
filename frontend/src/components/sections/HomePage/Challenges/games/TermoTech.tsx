import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Delete, CornerDownLeft } from 'lucide-react';
import { getWordOfTheDay, isValidWord } from './termoWords';
import {
  evaluateGuess,
  mergeKeyStates,
  type LetterState,
} from './termoLogic';

interface TermoTechProps {
  onExit: () => void;
  onWin?: (attempts: number) => void;
}

const MAX_ATTEMPTS = 6;
const WORD_LEN = 5;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];

// Termo Tech: adivinhe a palavra de tecnologia do dia em ate 6 tentativas.
// Chave de cache do progresso do dia (por data), no localStorage do usuario.
const dayKey = () => {
  const d = new Date();
  return `termotech:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
};

interface SavedGame {
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
}

function loadSaved(): SavedGame | null {
  try {
    const raw = localStorage.getItem(dayKey());
    return raw ? (JSON.parse(raw) as SavedGame) : null;
  } catch {
    return null;
  }
}

export function TermoTech({ onExit, onWin }: TermoTechProps) {
  const answer = useMemo(() => getWordOfTheDay(), []);
  const saved = useMemo(() => loadSaved(), []);

  const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
  const [current, setCurrent] = useState('');
  const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(
    saved?.status ?? 'playing',
  );
  const [shake, setShake] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // persiste o progresso do dia
  useEffect(() => {
    try {
      localStorage.setItem(dayKey(), JSON.stringify({ guesses, status }));
    } catch {
      // ignora se localStorage indisponivel
    }
  }, [guesses, status]);

  const keyStates = useMemo(() => {
    let map: Record<string, LetterState> = {};
    for (const g of guesses) {
      map = mergeKeyStates(map, g, evaluateGuess(g, answer));
    }
    return map;
  }, [guesses, answer]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 1600);
  };

  const submit = useCallback(() => {
    if (status !== 'playing') return;
    if (current.length !== WORD_LEN) {
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }
    if (!isValidWord(current)) {
      showToast('Palavra nao esta na lista');
      setShake(true);
      setTimeout(() => setShake(false), 400);
      return;
    }

    const next = [...guesses, current.toUpperCase()];
    setGuesses(next);
    setCurrent('');

    if (current.toUpperCase() === answer) {
      setStatus('won');
      onWin?.(next.length);
    } else if (next.length >= MAX_ATTEMPTS) {
      setStatus('lost');
    }
  }, [current, guesses, status, answer, onWin]);

  const press = useCallback(
    (key: string) => {
      if (status !== 'playing') return;
      if (key === 'ENTER') return submit();
      if (key === 'BACK') return setCurrent((c) => c.slice(0, -1));
      if (/^[A-Z]$/.test(key) && current.length < WORD_LEN) {
        setCurrent((c) => c + key);
      }
    },
    [current, status, submit],
  );

  // teclado fisico
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toUpperCase();
      if (k === 'ENTER') press('ENTER');
      else if (k === 'BACKSPACE') press('BACK');
      else if (/^[A-Z]$/.test(k) && k.length === 1) press(k);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [press]);

  const rows = Array.from({ length: MAX_ATTEMPTS });

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      {/* barra superior: apenas voltar */}
      <div className="flex items-center h-8 shrink-0">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar aos desafios</span>
        </button>
      </div>

      {/* area do jogo centralizada (horizontal e vertical) */}
      <div className="flex-1 flex flex-col items-center justify-center">
        {/* titulo do jogo */}
        <h1 className="text-[var(--text-primary)] font-[var(--font-family-base)] text-4xl sm:text-5xl tracking-wide mb-8 text-center">
          TERMO TECH
        </h1>

      {toast && (
        <div className="mb-3 px-4 py-2 bg-[var(--surface)] border border-[var(--border)] rounded-lg text-sm text-[var(--text-primary)]">
          {toast}
        </div>
      )}

      {/* grade */}
      <motion.div
        className="grid gap-1.5 mb-6"
        animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}}
        transition={{ duration: 0.4 }}
      >
        {rows.map((_, r) => {
          const guess = guesses[r];
          const isCurrentRow = r === guesses.length && status === 'playing';
          const states = guess ? evaluateGuess(guess, answer) : [];
          return (
            <div key={r} className="flex gap-1.5">
              {Array.from({ length: WORD_LEN }).map((_, c) => {
                const letter = guess
                  ? guess[c]
                  : isCurrentRow
                    ? current[c] ?? ''
                    : '';
                const state = guess ? states[c] : undefined;
                return (
                  <Tile
                    key={c}
                    letter={letter}
                    state={state}
                    filled={!!letter}
                    delay={c * 0.08}
                    revealed={!!guess}
                  />
                );
              })}
            </div>
          );
        })}
      </motion.div>

      {/* resultado */}
      {status !== 'playing' && (
        <div className="mb-5 text-center">
          {status === 'won' ? (
            <p className="text-[var(--accent-text)] font-semibold">
              Acertou em {guesses.length}/{MAX_ATTEMPTS}! +XP
            </p>
          ) : (
            <p className="text-[var(--danger)] font-semibold">
              A palavra era: {answer}
            </p>
          )}
        </div>
      )}

      {/* teclado virtual */}
      <div className="flex flex-col gap-1.5 items-center select-none">
        {KEYS.map((row, i) => (
          <div key={i} className="flex gap-1.5">
            {i === 2 && <KeyCap wide label="ENTER" onClick={() => press('ENTER')} icon={CornerDownLeft} />}
            {row.split('').map((ch) => (
              <KeyCap
                key={ch}
                label={ch}
                state={keyStates[ch]}
                onClick={() => press(ch)}
              />
            ))}
            {i === 2 && <KeyCap wide label="APAGAR" onClick={() => press('BACK')} icon={Delete} />}
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// --- Peca da grade ---

interface TileProps {
  letter: string;
  state?: LetterState;
  filled: boolean;
  delay: number;
  revealed: boolean;
}

const stateBg: Record<LetterState, string> = {
  // verde: letra certa no lugar certo
  correct: 'bg-[#2e9e4b] border-[#2e9e4b] text-white',
  // laranja: letra certa no lugar errado
  present: 'bg-[#e08a1e] border-[#e08a1e] text-white',
  // preto: letra que nao existe na palavra
  absent: 'bg-[#1c1c1e] border-[#2a2a2e] text-[#8a8a90]',
};

function Tile({ letter, state, filled, delay, revealed }: TileProps) {
  const base =
    'w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center rounded-md border-2 text-2xl font-bold uppercase font-[var(--font-family-base)]';
  const look = state
    ? stateBg[state]
    : filled
      ? 'border-[var(--primary-60)] text-[var(--text-primary)] bg-[var(--surface)]'
      : 'border-[var(--border)] text-[var(--text-primary)] bg-[var(--surface)]';

  return (
    <motion.div
      className={`${base} ${look}`}
      initial={revealed ? { rotateX: 0 } : false}
      animate={revealed ? { rotateX: [0, 90, 0] } : filled ? { scale: [1, 1.08, 1] } : {}}
      transition={revealed ? { duration: 0.5, delay } : { duration: 0.12 }}
    >
      {letter}
    </motion.div>
  );
}

// --- Tecla do teclado virtual ---

interface KeyCapProps {
  label: string;
  state?: LetterState;
  wide?: boolean;
  icon?: React.ElementType;
  onClick: () => void;
}

function KeyCap({ label, state, wide, icon: Icon, onClick }: KeyCapProps) {
  const look = state
    ? stateBg[state]
    : 'bg-[var(--surface-alt)] border-[var(--border)] text-[var(--text-primary)]';
  return (
    <button
      onClick={onClick}
      className={`${wide ? 'px-3' : 'w-8 sm:w-10'} h-11 flex items-center justify-center rounded-md border text-sm font-semibold font-[var(--font-family-inter)] transition-transform active:scale-95 cursor-pointer ${look}`}
    >
      {Icon ? <Icon size={16} /> : label}
    </button>
  );
}
