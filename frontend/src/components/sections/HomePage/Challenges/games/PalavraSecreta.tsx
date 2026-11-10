import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { getWordOfTheDayDetails, isValidWord } from './palavraWords';
import { isValidPalavraGuess, normalizePalavraWord, preloadPalavraDictionary } from './palavraDictionary';
import { evaluateGuess, mergeKeyStates, type LetterState, } from './palavraLogic';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { loadPalavraGame, palavraStorageKey, savePalavraGame } from './palavraStorage';
import { GameWorld, WorldGuide, WorldOpening, WorldResult } from '../world';
import '@/styles/games/palavra.css';
interface PalavraSecretaProps {
    onExit: () => void;
    xp?: number;
    userId: number | null;
    onWin?: (attempts: number) => void;
}
type Phase = 'opening' | 'playing' | 'result';
const MAX_ATTEMPTS = 6;
const WORD_LEN = 5;
const KEYS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM'];
/** Tempo para ver a última linha virar antes de abrir o resultado. */
const RESULT_DELAY_MS = 1300;
const ARTWORK = getChallengeArtwork(null, 'termotech');
const stateClass: Record<LetterState, string> = {
    correct: 't-c',
    present: 't-p',
    absent: 't-a',
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
export function PalavraSecreta({ onExit, userId, onWin }: PalavraSecretaProps) {
    const dailyWord = useMemo(() => getWordOfTheDayDetails(), []);
    const answer = dailyWord.word;
    const storageKey = useMemo(() => palavraStorageKey(userId), [userId]);
    const saved = useMemo(() => loadPalavraGame(storageKey, window.localStorage), [storageKey]);
    const [guesses, setGuesses] = useState<string[]>(saved?.guesses ?? []);
    const [current, setCurrent] = useState('     ');
    const [selectedCell, setSelectedCell] = useState(0);
    const [status, setStatus] = useState<'playing' | 'won' | 'lost'>(saved?.status ?? 'playing');
    // Abertura só no primeiro acesso do dia; com tentativas salvas vai direto ao jogo; terminado vai ao resultado.
    const [phase, setPhase] = useState<Phase>(() => (saved?.status === 'won' || saved?.status === 'lost')
        ? 'result'
        : (saved?.guesses.length ?? 0) > 0 ? 'playing' : 'opening');
    // Só a linha enviada agora vira com animação; as restauradas do dia aparecem prontas.
    const [flippedRow, setFlippedRow] = useState<number | null>(null);
    const reduceMotion = useReducedMotion();
    const boardRef = useRef<HTMLDivElement>(null);
    const [shake, setShake] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(false);
    const checkingRef = useRef(false);
    const toastTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const shakeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const selectCell = useCallback((index: number) => {
        setSelectedCell(index);
        if (boardRef.current?.contains(document.activeElement)) {
            requestAnimationFrame(() => {
                const row = boardRef.current?.querySelector('.bp-row[aria-current="true"]');
                (row?.querySelector(`[data-cell-index="${index}"]`) as HTMLElement | null)?.focus();
            });
        }
    }, []);
    useEffect(() => {
        void preloadPalavraDictionary().catch(() => undefined);
    }, []);
    useEffect(() => {
        savePalavraGame(storageKey, { guesses, status }, window.localStorage);
    }, [guesses, status, storageKey]);
    useEffect(() => () => {
        clearTimeout(toastTimer.current);
        clearTimeout(shakeTimer.current);
    }, []);
    // Terminou a partida: deixa a última linha virar e então abre o resultado.
    useEffect(() => {
        if (phase !== 'playing' || status === 'playing')
            return;
        const timer = setTimeout(() => setPhase('result'), reduceMotion ? 0 : RESULT_DELAY_MS);
        return () => clearTimeout(timer);
    }, [phase, status, reduceMotion]);
    const keyStates = useMemo(() => {
        let map: Record<string, LetterState> = {};
        for (const g of guesses) {
            map = mergeKeyStates(map, g, evaluateGuess(g, answer));
        }
        return map;
    }, [guesses, answer]);
    const showToast = (msg: string) => {
        clearTimeout(toastTimer.current);
        setToast(msg);
        toastTimer.current = setTimeout(() => setToast(null), 1600);
    };
    const shakeBoard = () => {
        clearTimeout(shakeTimer.current);
        setShake(true);
        shakeTimer.current = setTimeout(() => setShake(false), 400);
    };
    const submit = useCallback(async () => {
        if (status !== 'playing' || checkingRef.current)
            return;
        if (current.includes(' ')) {
            showToast('Preencha as cinco casas antes de tentar.');
            shakeBoard();
            return;
        }
        const candidate = normalizePalavraWord(current.replace(/ /g, ''));
        if (!isValidWord(candidate)) {
            checkingRef.current = true;
            setIsChecking(true);
            try {
                const valid = await isValidPalavraGuess(candidate);
                if (!valid) {
                    showToast('Palavra não encontrada em português ou inglês.');
                    shakeBoard();
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
        setFlippedRow(next.length - 1);
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
        if (phase !== 'playing')
            return;
        const onKey = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement | null;
            if (target?.isContentEditable || target?.closest('input, textarea, select, [contenteditable="true"]')) return;
            const cell = target?.closest('[data-palavra-cell]');
            const virtualKey = target?.closest('.bp-kb button');
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
    }, [phase, press, selectCell, selectedCell, status]);
    const won = status === 'won';
    const attemptNumber = Math.min(guesses.length + 1, MAX_ATTEMPTS);
    const chip = phase === 'playing' ? <span>Tentativa {attemptNumber} de {MAX_ATTEMPTS}</span> : undefined;
    return (<GameWorld world="pal" title="Palavra Secreta" artwork={ARTWORK} onExit={onExit} className="bp" celebrate={phase === 'result' && won} chip={chip}>
      {phase === 'opening' && (<WorldOpening title="Palavra Secreta" artwork={ARTWORK} kicker="Nº 04/04 · Palavras" steps={[
                `A palavra tem ${WORD_LEN} letras.`,
                `Você tem ${MAX_ATTEMPTS} tentativas.`,
                'As cores das letras mostram se você está perto.',
            ]} facts={['Não usa ficha', 'Nova palavra todo dia', 'Funciona com o teclado']} guide="Todo dia tem uma palavra secreta. Vamos descobrir?" startLabel="Começar" onStart={() => setPhase('playing')} onExit={onExit}/>)}

      {phase === 'playing' && (<div className="bp-grid">
          <aside className="bp-note" aria-label="Dica da palavra">
            <p className="gw-k">{WORD_LEN} letras</p>
            <h2>Dica</h2>
            <p>{dailyWord.hint}</p>
            <div className="bp-leg">
              <div><i className="t-c" aria-hidden="true">✓</i><span>Letra certa no lugar certo</span></div>
              <div><i className="t-p" aria-hidden="true">↔</i><span>A letra existe, mas está em outro lugar</span></div>
              <div><i className="t-a" aria-hidden="true">×</i><span>Essa letra não está na palavra</span></div>
            </div>
          </aside>

          <section className="bp-center" aria-label={status === 'playing' ? `Tabuleiro da palavra. Tentativa ${attemptNumber} de ${MAX_ATTEMPTS}` : 'Tabuleiro da palavra concluída'} aria-busy={isChecking}>
            {(toast || isChecking) && <div className="bp-toast" role="status">{toast ?? 'Validando palavra...'}</div>}
            <div className="bp-door">
              <span className="bp-handle" aria-hidden="true"/>
              <div className="bp-panel">
                <div ref={boardRef} className={`bp-rows${shake && !reduceMotion ? ' shake' : ''}`} role="grid" aria-label="Tentativas da palavra secreta">
                  {Array.from({ length: MAX_ATTEMPTS }).map((_, r) => {
                const guess = guesses[r];
                const isCurrentRow = r === guesses.length && status === 'playing';
                const states = guess ? evaluateGuess(guess, answer) : [];
                return (<div key={r} className="bp-row" role="row" aria-current={isCurrentRow ? 'true' : undefined}>
                        {Array.from({ length: WORD_LEN }).map((_, c) => {
                        const letter = guess
                            ? guess[c]
                            : isCurrentRow
                                ? current[c] === ' ' ? '' : current[c] ?? ''
                                : '';
                        const state = guess ? states[c] : undefined;
                        return (<Tile key={c} letter={letter} state={state} flip={r === flippedRow} delay={c * 0.09} cellIndex={c} selected={!guess && isCurrentRow && c === selectedCell} interactive={isCurrentRow} onSelect={selectCell}/>);
                    })}
                      </div>);
            })}
                </div>
              </div>
            </div>

            <div className="bp-kb" role="group" aria-label="Teclado virtual">
              {KEYS.map((row, i) => (<div key={i}>
                  {i === 2 && <KeyCap wide label="APAGAR" onClick={() => press('BACK')} disabled={isChecking || status !== 'playing'}/>}
                  {row.split('').map((ch) => (<KeyCap key={ch} label={ch} state={keyStates[ch]} onClick={() => press(ch)} disabled={isChecking || status !== 'playing'}/>))}
                  {i === 2 && <KeyCap wide label="ENTER" onClick={() => press('ENTER')} disabled={isChecking || status !== 'playing'}/>}
                </div>))}
            </div>
          </section>

          <div className="bp-side">
            <WorldGuide variant="col" live text={tipFor(guesses, answer)}/>
          </div>
        </div>)}

      {phase === 'result' && (<WorldResult title={won ? 'Você descobriu a palavra!' : 'Quase lá!'} kicker={won ? 'Palavra aberta' : 'Fim das tentativas'} hero={<>
            <div className={`bp-open${won ? '' : ' is-closed'}`} aria-hidden="true">
              <span className="bp-open-in"><img className="gw-px" src={ARTWORK} alt="" width={116} height={116}/></span>
              <span className="bp-open-door"><span className="bp-open-handle"/></span>
            </div>
            <div className="bp-word" role="img" aria-label={`A palavra era ${answer}`}>
              {answer.split('').map((ch, i) => (<span key={i} className={won ? 't-c' : 'n'}>{ch}</span>))}
            </div>
          </>} xpText={won
                ? `Descoberta em ${guesses.length} de ${MAX_ATTEMPTS} tentativas.`
                : `A palavra era ${answer}. Amanhã tem outra!`} guide="Amanhã tem uma palavra nova. Até lá!" onExit={onExit}>
          <p className="gw-k">Suas tentativas</p>
          <div className="bp-mini" role="img" aria-label={`Suas tentativas: ${guesses.join(', ')}`}>
            {guesses.map((guess, r) => {
                const states = evaluateGuess(guess, answer);
                return (<div key={r}>{guess.split('').map((ch, c) => (<span key={c} className={stateClass[states[c]]}>{ch}</span>))}</div>);
            })}
          </div>
          <p className="bp-hint">Dica do dia: {dailyWord.hint}</p>
        </WorldResult>)}
    </GameWorld>);
}
/** Fala do guia, de acordo com a última tentativa. */
function tipFor(guesses: string[], answer: string): string {
    if (guesses.length === 0)
        return 'Cada cor é uma pista para descobrir a palavra.';
    const inPlace = evaluateGuess(guesses[guesses.length - 1], answer).filter((state) => state === 'correct').length;
    return inPlace >= 2
        ? `${inPlace} letras já estão no lugar. Falta pouco!`
        : 'As letras amarelas existem, mas em outro lugar.';
}
interface TileProps {
    letter: string;
    state?: LetterState;
    flip: boolean;
    delay: number;
    selected?: boolean;
    interactive?: boolean;
    cellIndex: number;
    onSelect?: (index: number) => void;
}
function Tile({ letter, state, flip, delay, selected, interactive, cellIndex, onSelect }: TileProps) {
    const look = state ? `${stateClass[state]}${flip ? ' rev' : ''}` : `${letter ? 'f' : ''}${selected ? ' cur' : ''}`;
    const accessibleLabel = letter
        ? `Casa ${cellIndex + 1}, ${letter}${state ? `: ${stateDescription[state]}` : ''}${selected ? ', selecionada' : ''}`
        : `Casa ${cellIndex + 1}, vazia${selected ? ', selecionada' : ''}`;
    return (<div role="gridcell" data-palavra-cell="true" data-cell-index={cellIndex} tabIndex={interactive ? (selected ? 0 : -1) : undefined} aria-label={accessibleLabel} aria-selected={selected || undefined} onClick={interactive ? () => onSelect?.(cellIndex) : undefined} onKeyDown={interactive ? (event) => { if (event.key === ' ') { event.preventDefault(); event.stopPropagation(); onSelect?.(cellIndex); } } : undefined} className={`bp-t ${look}`} style={flip ? { animationDelay: `${delay}s` } : undefined}>
      {letter}{state && <small aria-hidden="true">{stateSymbol[state]}</small>}
    </div>);
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
    return (<button type="button" onClick={onClick} aria-label={labelWithState} className={`bp-key${wide ? ' w' : ''} ${look}`} disabled={disabled}>
      {label}
    </button>);
}
