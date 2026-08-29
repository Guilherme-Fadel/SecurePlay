import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Binary, CalendarDays, CornerDownLeft, Delete, Keyboard, Target } from 'lucide-react';
import { getWordOfTheDay, isValidWord } from './termoWords';
import { evaluateGuess, mergeKeyStates, type LetterState, } from './termoLogic';
import { ChallengeGameShell } from '../ChallengeGameShell';
interface TermoTechProps {
    onExit: () => void;
    onWin?: (attempts: number) => void;
}
const MAX_ATTEMPTS = 6;
const WORD_LEN = 5;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
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
    }
    catch {
        return null;
    }
}
export function TermoTech({ onExit, onWin }: TermoTechProps) {
    const answer = useMemo(() => getWordOfTheDay(), []);
    const saved = useMemo(() => loadSaved(), []);
    const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
    const [current, setCurrent] = useState('');
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(saved?.status ?? 'playing');
    const [shake, setShake] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    useEffect(() => {
        try {
            localStorage.setItem(dayKey(), JSON.stringify({ guesses, status }));
        }
        catch {
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
        if (status !== 'playing')
            return;
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
        }
        else if (next.length >= MAX_ATTEMPTS) {
            setStatus('lost');
        }
    }, [current, guesses, status, answer, onWin]);
    const press = useCallback((key: string) => {
        if (status !== 'playing')
            return;
        if (key === 'ENTER')
            return submit();
        if (key === 'BACK')
            return setCurrent((c) => c.slice(0, -1));
        if (/^[A-Z]$/.test(key) && current.length < WORD_LEN) {
            setCurrent((c) => c + key);
        }
    }, [current, status, submit]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const k = e.key.toUpperCase();
            if (k === 'ENTER')
                press('ENTER');
            else if (k === 'BACKSPACE')
                press('BACK');
            else if (/^[A-Z]$/.test(k) && k.length === 1)
                press(k);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [press]);
    const rows = Array.from({ length: MAX_ATTEMPTS });
    return (<ChallengeGameShell title="Termo Tech" eyebrow="Laboratório de decodificação" description="Descubra a palavra de tecnologia do dia em até seis tentativas." icon={Binary} onExit={onExit} progress={(guesses.length / MAX_ATTEMPTS) * 100} progressLabel={`${guesses.length} de ${MAX_ATTEMPTS} tentativas utilizadas`} metrics={[
            { icon: Target, label: 'Tentativas', value: `${guesses.length}/${MAX_ATTEMPTS}` },
            { icon: Keyboard, label: 'Palavra', value: `${WORD_LEN} letras` },
            { icon: CalendarDays, label: 'Rotação', value: 'Diária' },
        ]} className="termotech-mission">
      <div className="termotech-workspace">
        <aside className="termotech-briefing">
          <span className="termotech-briefing-code">PALAVRA // {WORD_LEN} CARACTERES</span>
          <h2>Decodifique o termo oculto</h2>
          <p>Cada tentativa revela o quanto você se aproximou da resposta.</p>
          <div className="termotech-legend">
            <div><i className="is-correct"/><span>Posição correta</span></div>
            <div><i className="is-present"/><span>Letra deslocada</span></div>
            <div><i className="is-absent"/><span>Fora da palavra</span></div>
          </div>
          <div className="termotech-attempt-readout">
            <span>Tentativa ativa</span>
            <strong>{Math.min(guesses.length + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}</strong>
          </div>
        </aside>

        <section className="termotech-board" aria-label="Tabuleiro do Termo Tech">
          {toast && <div className="termotech-toast" role="status">{toast}</div>}

          <motion.div className="termotech-grid" animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
            {rows.map((_, r) => {
            const guess = guesses[r];
            const isCurrentRow = r === guesses.length && status === 'playing';
            const states = guess ? evaluateGuess(guess, answer) : [];
            return (<div key={r} className="termotech-row">
                  {Array.from({ length: WORD_LEN }).map((_, c) => {
                    const letter = guess
                        ? guess[c]
                        : isCurrentRow
                            ? current[c] ?? ''
                            : '';
                    const state = guess ? states[c] : undefined;
                    return (<Tile key={c} letter={letter} state={state} filled={!!letter} delay={c * 0.08} revealed={!!guess}/>);
                })}
                </div>);
        })}
          </motion.div>

          {status !== 'playing' && (<div className={`termotech-status-banner is-${status}`}>
              {status === 'won'
                ? `Código decifrado em ${guesses.length} tentativas. Excelente análise!`
                : `Protocolo encerrado. A palavra correta era ${answer}.`}
            </div>)}

          <div className="termotech-keyboard" aria-label="Teclado virtual">
            {KEYS.map((row, i) => (<div key={i}>
                {i === 2 && <KeyCap wide label="ENTER" onClick={() => press('ENTER')} icon={CornerDownLeft}/>}
                {row.split('').map((ch) => (<KeyCap key={ch} label={ch} state={keyStates[ch]} onClick={() => press(ch)}/>))}
                {i === 2 && <KeyCap wide label="APAGAR" onClick={() => press('BACK')} icon={Delete}/>}
              </div>))}
          </div>
        </section>
      </div>
    </ChallengeGameShell>);
}
interface TileProps {
    letter: string;
    state?: LetterState;
    filled: boolean;
    delay: number;
    revealed: boolean;
}
const stateClass: Record<LetterState, string> = {
    correct: 'is-correct',
    present: 'is-present',
    absent: 'is-absent',
};
function Tile({ letter, state, filled, delay, revealed }: TileProps) {
    const look = state ? stateClass[state] : filled ? 'is-filled' : '';
    return (<motion.div className={`termotech-tile ${look}`} initial={revealed ? { rotateX: 0 } : false} animate={revealed ? { rotateX: [0, 90, 0] } : filled ? { scale: [1, 1.08, 1] } : {}} transition={revealed ? { duration: 0.5, delay } : { duration: 0.12 }}>
      {letter}
    </motion.div>);
}
interface KeyCapProps {
    label: string;
    state?: LetterState;
    wide?: boolean;
    icon?: React.ElementType;
    onClick: () => void;
}
function KeyCap({ label, state, wide, icon: Icon, onClick }: KeyCapProps) {
    const look = state ? stateClass[state] : '';
    return (<button onClick={onClick} aria-label={label} className={`termotech-key ${wide ? 'is-wide' : ''} ${look}`}>
      {Icon ? <Icon size={16}/> : label}
    </button>);
}
