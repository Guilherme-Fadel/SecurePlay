import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { getWordOfTheDayDetails, isValidWord } from './termoWords';
import { isValidTermoGuess, normalizeTermoWord, preloadTermoDictionary } from './termoDictionary';
import { evaluateGuess, mergeKeyStates, type LetterState, } from './termoLogic';
import { ChallengeGameShell } from '../ChallengeGameShell';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
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
    const [current, setCurrent] = useState('     ');
    const [selectedCell, setSelectedCell] = useState(0);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(saved?.status ?? 'playing');
    const reduceMotion = useReducedMotion();
    const boardRef = useRef<HTMLDivElement>(null);
    const [shake, setShake] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const checkingRef = useRef(false);
    const selectCell = useCallback((index: number) => {
        setSelectedCell(index);
        if (boardRef.current?.contains(document.activeElement)) {
            requestAnimationFrame(() => {
                const row = boardRef.current?.querySelector('.termotech-row[aria-current="true"]');
                (row?.querySelector(`[data-cell-index="${index}"]`) as HTMLElement | null)?.focus();
            });
        }
    }, []);
    useEffect(() => {
        void preloadTermoDictionary().catch(() => undefined);
    }, []);
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
        if (current.includes(' ')) {
            showToast('Preencha as cinco casas antes de tentar.');
            setShake(true);
            setTimeout(() => setShake(false), 400);
            return;
        }
        const candidate = normalizeTermoWord(current.replace(/ /g, ''));
        if (!isValidWord(candidate)) {
            checkingRef.current = true;
            setIsChecking(true);
            try {
                const valid = await isValidTermoGuess(candidate);
                if (!valid) {
                    showToast('Palavra não encontrada em português ou inglês.');
                    setShake(true);
                    setTimeout(() => setShake(false), 400);
                    return;
                }
            }
            catch {
                showToast('Não foi possível carregar o dicionário. Tente novamente.');
                return;
            }
            finally {
                checkingRef.current = false;
                setIsChecking(false);
            }
        }
        const next = [...guesses, candidate];
        setGuesses(next);
        setCurrent('     ');
        selectCell(0);
        if (candidate === answer) {
            setStatus('won');
            onWin?.(next.length);
        }
        else if (next.length >= MAX_ATTEMPTS) {
            setStatus('lost');
        }
    }, [current, guesses, status, answer, onWin, selectCell]);
    const press = useCallback((key: string) => {
        if (status !== 'playing' || checkingRef.current)
            return;
        if (key === 'ENTER') {
            void submit();
            return;
        }
        if (key === 'BACK') {
            const next = current.split('');
            let targetCell = selectedCell;
            if (next[targetCell] === ' ') {
                targetCell -= 1;
                while (targetCell >= 0 && next[targetCell] === ' ')
                    targetCell -= 1;
            }
            if (targetCell < 0)
                return;
            next[targetCell] = ' ';
            setCurrent(next.join(''));
            selectCell(targetCell);
            return;
        }
        if (/^[A-Z]$/.test(key)) {
            setCurrent((value) => {
                const next = value.split('');
                next[selectedCell] = key;
                return next.join('');
            });
            selectCell(Math.min(selectedCell + 1, WORD_LEN - 1));
        }
    }, [current, selectedCell, status, submit, selectCell]);
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.isContentEditable || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            const cell = target?.closest('[data-termo-cell]');
            const virtualKey = target?.closest('.termotech-keyboard button');
            if ((target?.matches('button, a, [role="button"]') && !cell && !virtualKey) || (target && !boardRef.current?.contains(target) && !virtualKey && target !== document.body)) return;
            const k = e.key.toUpperCase();
            if (virtualKey && k === 'ENTER') return;
            if (status === 'playing' && (k === 'ARROWLEFT' || k === 'ARROWRIGHT')) {
                e.preventDefault();
                selectCell(Math.max(0, Math.min(WORD_LEN - 1, selectedCell + (k === 'ARROWRIGHT' ? 1 : -1))));
            }
            else if (k === 'ENTER')
                press('ENTER');
            else if (k === 'BACKSPACE')
                press('BACK');
            else if (/^[A-Z]$/.test(k) && k.length === 1)
                press(k);
        };
        window.addEventListener('keydown', onKey);
        return () => window.removeEventListener('keydown', onKey);
    }, [press, selectCell, selectedCell, status]);
    const rows = Array.from({ length: MAX_ATTEMPTS });
    return (<ChallengeGameShell title="Palavra Secreta" description="Descubra a palavra em até seis tentativas." artwork={getChallengeArtwork(null, 'termotech')} onExit={onExit} progress={status === 'playing' ? (guesses.length / MAX_ATTEMPTS) * 100 : 100} progressLabel={status === 'playing' ? `${guesses.length} de ${MAX_ATTEMPTS} tentativas usadas` : 'Missão concluída'} className="termotech-mission">
      <div className="termotech-workspace">
        <section className="termotech-briefing" aria-label="Dica da palavra">
          <span className="termotech-briefing-code">MISSÃO DO DIA · {WORD_LEN} LETRAS</span>
          <h2>Descubra a palavra secreta</h2>
          <p className="termotech-hint"><strong>Dica:</strong> {dailyWord.hint}</p>
          <details className="termotech-legend-disclosure">
            <summary>Como funcionam os sinais?</summary>
            <div className="termotech-legend">
            <div><i className="is-correct" aria-hidden="true">✓</i><span>Letra certa no lugar certo</span></div>
            <div><i className="is-present" aria-hidden="true">↔</i><span>A letra existe, mas está em outro lugar</span></div>
            <div><i className="is-absent" aria-hidden="true">×</i><span>Essa letra não está na palavra</span></div>
            </div>
          </details>
        </section>

        <section className="termotech-board" aria-label={status === 'playing' ? `Tabuleiro da palavra. Tentativa ${Math.min(guesses.length + 1, MAX_ATTEMPTS)} de ${MAX_ATTEMPTS}` : 'Tabuleiro da palavra concluída'} aria-busy={isChecking}>
          {(toast || isChecking) && <div className="termotech-toast" role="status">{toast ?? 'Validando palavra...'}</div>}

          <motion.div ref={boardRef} className="termotech-grid" role="grid" aria-label="Tentativas da palavra secreta" animate={shake && !reduceMotion ? { x: [0, -8, 8, -6, 6, 0] } : {}} transition={{ duration: reduceMotion ? 0 : 0.4 }}>
            {rows.map((_, r) => {
            const guess = guesses[r];
            const isCurrentRow = r === guesses.length && status === 'playing';
            const states = guess ? evaluateGuess(guess, answer) : [];
            return (<div key={r} className="termotech-row" role="row" aria-current={isCurrentRow ? 'true' : undefined}>
                  {Array.from({ length: WORD_LEN }).map((_, c) => {
                    const letter = guess
                        ? guess[c]
                        : isCurrentRow
                            ? current[c] === ' ' ? '' : current[c] ?? ''
                            : '';
                    const state = guess ? states[c] : undefined;
                    return (<Tile key={c} letter={letter} state={state} filled={!!letter} delay={c * 0.08} revealed={!!guess} cellIndex={c} selected={!guess && isCurrentRow && c === selectedCell} reduceMotion={!!reduceMotion} interactive={isCurrentRow} onSelect={selectCell}/>);
                })}
                </div>);
        })}
          </motion.div>

          {status !== 'playing' && (<div className={`termotech-status-banner is-${status}`} role="status" aria-live="polite">
              {status === 'won'
                ? `Palavra descoberta em ${guesses.length} tentativas. Muito bem!`
                : `A palavra era ${answer}. Amanhã tem outra aventura!`}
            </div>)}

          {status === 'playing' && <div className="termotech-keyboard" role="group" aria-label="Teclado virtual">
            {KEYS.map((row, i) => (<div key={i}>
                {i === 2 && <KeyCap wide label="ENTER" onClick={() => press('ENTER')} disabled={isChecking}/>}
                {row.split('').map((ch) => (<KeyCap key={ch} label={ch} state={keyStates[ch]} onClick={() => press(ch)} disabled={isChecking}/>))}
                {i === 2 && <KeyCap wide label="APAGAR" onClick={() => press('BACK')} disabled={isChecking}/>}
              </div>))}
          </div>}
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
    selected?: boolean;
    reduceMotion?: boolean;
    interactive?: boolean;
    cellIndex: number;
    onSelect?: (index: number) => void;
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
function Tile({ letter, state, filled, delay, revealed, selected, reduceMotion, interactive, cellIndex, onSelect }: TileProps) {
    const look = `${state ? stateClass[state] : filled ? 'is-filled' : ''}${selected ? ' is-selected' : ''}`;
    const accessibleLabel = letter
        ? `Casa ${cellIndex + 1}, ${letter}${state ? `: ${stateDescription[state]}` : ''}${selected ? ', selecionada' : ''}`
        : `Casa ${cellIndex + 1}, vazia${selected ? ', selecionada' : ''}`;
    return (<motion.div role="gridcell" data-termo-cell="true" data-cell-index={cellIndex} tabIndex={interactive ? (selected ? 0 : -1) : undefined} aria-label={accessibleLabel} aria-selected={selected || undefined} onClick={interactive ? () => onSelect?.(cellIndex) : undefined} onKeyDown={interactive ? (event) => { if (event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect?.(cellIndex); } } : undefined} className={`termotech-tile ${look}`} initial={revealed && !reduceMotion ? { rotateX: 0 } : false} animate={!reduceMotion && revealed ? { rotateX: [0, 90, 0] } : !reduceMotion && filled ? { scale: [1, 1.08, 1] } : {}} transition={{ duration: reduceMotion ? 0 : revealed ? 0.5 : 0.12, delay: reduceMotion ? 0 : delay }}>
      <span>{letter}</span>{state && <small aria-hidden="true">{stateSymbol[state]}</small>}
    </motion.div>);
}
interface KeyCapProps {
    label: string;
    state?: LetterState;
    wide?: boolean;
    onClick: () => void;
    disabled?: boolean;
}
function KeyCap({ label, state, wide, onClick, disabled }: KeyCapProps) {
    const look = state ? stateClass[state] : '';
    const labelWithState = state ? `${label}: ${stateDescription[state]}` : label;
    return (<button type="button" onClick={onClick} aria-label={labelWithState} className={`termotech-key ${wide ? 'is-wide' : ''} ${look}`} disabled={disabled}>
      {label}
    </button>);
}
