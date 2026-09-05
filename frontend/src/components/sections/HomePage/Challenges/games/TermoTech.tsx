import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { Binary, CalendarDays, CornerDownLeft, Delete, Keyboard, Target } from 'lucide-react';
import { getWordOfTheDayDetails, isValidWord } from './termoWords';
import { evaluateGuess, mergeKeyStates, type LetterState, } from './termoLogic';
import { ChallengeGameShell } from '../ChallengeGameShell';
import { validateTermoWord } from '@/services/arcade';
interface TermoTechProps {
    onExit: () => void;
    onWin?: (attempts: number) => void;
}
const MAX_ATTEMPTS = 6;
const WORD_LEN = 5;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
const dayKey = () => {
    const d = new Date();
    return `termotech:v2:${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
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
    const dailyWord = useMemo(() => getWordOfTheDayDetails(), []);
    const answer = dailyWord.word;
    const saved = useMemo(() => loadSaved(), []);
    const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
    const [current, setCurrent] = useState('');
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(saved?.status ?? 'playing');
    const [shake, setShake] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const checkingRef = useRef(false);
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
    const submit = useCallback(async () => {
        if (status !== 'playing' || checkingRef.current)
            return;
        if (current.length !== WORD_LEN) {
            showToast('Use cinco letras para tentar.');
            setShake(true);
            setTimeout(() => setShake(false), 400);
            return;
        }
        const candidate = current.toUpperCase();
        if (!isValidWord(candidate)) {
            checkingRef.current = true;
            setIsChecking(true);
            try {
                const validation = await validateTermoWord(candidate);
                if (!validation.valid) {
                    showToast(validation.reason === 'blocked'
                        ? 'Essa palavra não pode ser usada no jogo.'
                        : 'Palavra não encontrada em português ou inglês.');
                    setShake(true);
                    setTimeout(() => setShake(false), 400);
                    return;
                }
            }
            catch {
                showToast('Não foi possível consultar o dicionário. Tente novamente.');
                return;
            }
            finally {
                checkingRef.current = false;
                setIsChecking(false);
            }
        }
        const next = [...guesses, candidate];
        setGuesses(next);
        setCurrent('');
        if (candidate === answer) {
            setStatus('won');
            onWin?.(next.length);
        }
        else if (next.length >= MAX_ATTEMPTS) {
            setStatus('lost');
        }
    }, [current, guesses, status, answer, onWin]);
    const press = useCallback((key: string) => {
        if (status !== 'playing' || checkingRef.current)
            return;
        if (key === 'ENTER') {
            void submit();
            return;
        }
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
    return (<ChallengeGameShell title="Palavra secreta" eyebrow="Missão de palavras" description="Descubra a palavra do dia em até seis tentativas." icon={Binary} onExit={onExit} progress={(guesses.length / MAX_ATTEMPTS) * 100} progressLabel={`${guesses.length} de ${MAX_ATTEMPTS} tentativas utilizadas`} metrics={[
            { icon: Target, label: 'Tentativas', value: `${guesses.length}/${MAX_ATTEMPTS}` },
            { icon: Keyboard, label: 'Palavra', value: `${WORD_LEN} letras` },
            { icon: CalendarDays, label: 'Rotação', value: 'Diária' },
        ]} className="termotech-mission">
      <div className="termotech-workspace">
        <aside className="termotech-briefing">
          <span className="termotech-briefing-code">PALAVRA SECRETA // {WORD_LEN} LETRAS</span>
          <h2>Qual é a palavra secreta?</h2>
          <p>Use a dica e as cores para chegar pertinho da resposta.</p>
          <p className="termotech-hint"><strong>Dica do dia:</strong> {dailyWord.hint}</p>
          <div className="termotech-legend">
            <div><i className="is-correct" aria-hidden="true">✓</i><span>Letra certa no lugar certo</span></div>
            <div><i className="is-present" aria-hidden="true">↔</i><span>A letra existe, mas está em outro lugar</span></div>
            <div><i className="is-absent" aria-hidden="true">×</i><span>Essa letra não está na palavra</span></div>
          </div>
          <div className="termotech-attempt-readout">
            <span>Tentativa ativa</span>
            <strong>{Math.min(guesses.length + 1, MAX_ATTEMPTS)} / {MAX_ATTEMPTS}</strong>
          </div>
        </aside>

        <section className="termotech-board" aria-label="Tabuleiro do Termo Tech" aria-busy={isChecking}>
          {(toast || isChecking) && <div className="termotech-toast" role="status">{toast ?? 'Consultando os dicionários...'}</div>}

          <motion.div className="termotech-grid" role="grid" aria-label="Tentativas da palavra secreta" animate={shake ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: 0.4 }}>
            {rows.map((_, r) => {
            const guess = guesses[r];
            const isCurrentRow = r === guesses.length && status === 'playing';
            const states = guess ? evaluateGuess(guess, answer) : [];
            return (<div key={r} className="termotech-row" role="row">
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

          {status !== 'playing' && (<div className={`termotech-status-banner is-${status}`} role="status" aria-live="polite">
              {status === 'won'
                ? `Código decifrado em ${guesses.length} tentativas. Excelente análise!`
                : `Protocolo encerrado. A palavra correta era ${answer}.`}
            </div>)}

          <div className="termotech-keyboard" aria-label="Teclado virtual">
            {KEYS.map((row, i) => (<div key={i}>
                {i === 2 && <KeyCap wide label="ENTER" onClick={() => press('ENTER')} icon={CornerDownLeft} disabled={isChecking}/>}
                {row.split('').map((ch) => (<KeyCap key={ch} label={ch} state={keyStates[ch]} onClick={() => press(ch)} disabled={isChecking}/>))}
                {i === 2 && <KeyCap wide label="APAGAR" onClick={() => press('BACK')} icon={Delete} disabled={isChecking}/>}
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
const stateDescription: Record<LetterState, string> = {
    correct: 'letra certa no lugar certo',
    present: 'letra presente em outro lugar',
    absent: 'letra fora da palavra',
};
const stateSymbol: Record<LetterState, string> = {
    correct: '✓',
    present: '↔',
    absent: '×',
};
function Tile({ letter, state, filled, delay, revealed }: TileProps) {
    const look = state ? stateClass[state] : filled ? 'is-filled' : '';
    const accessibleLabel = letter
        ? `${letter}: ${state ? stateDescription[state] : 'ainda sem resultado'}`
        : 'Casa vazia';
    return (<motion.div role="gridcell" aria-label={accessibleLabel} className={`termotech-tile ${look}`} initial={revealed ? { rotateX: 0 } : false} animate={revealed ? { rotateX: [0, 90, 0] } : filled ? { scale: [1, 1.08, 1] } : {}} transition={revealed ? { duration: 0.5, delay } : { duration: 0.12 }}>
      <span>{letter}</span>{state && <small aria-hidden="true">{stateSymbol[state]}</small>}
    </motion.div>);
}
interface KeyCapProps {
    label: string;
    state?: LetterState;
    wide?: boolean;
    icon?: React.ElementType;
    onClick: () => void;
    disabled?: boolean;
}
function KeyCap({ label, state, wide, icon: Icon, onClick, disabled }: KeyCapProps) {
    const look = state ? stateClass[state] : '';
    const labelWithState = state ? `${label}: ${stateDescription[state]}` : label;
    return (<button type="button" onClick={onClick} aria-label={labelWithState} className={`termotech-key ${wide ? 'is-wide' : ''} ${look}`} disabled={disabled}>
      {Icon ? <Icon size={16}/> : label}
    </button>);
}
