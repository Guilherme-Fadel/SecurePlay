import { useCallback, useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { startRun, submitRun, type DataItemView, type DataAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { CoinFact, GameWorld, WorldButton, WorldChip, WorldFlags, WorldGuide, WorldOpening, WorldResult, WorldReviewItem, WorldReviewList, WorldState, } from '../world';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import '@/styles/games/escudos.css';
interface DataClassifyProps {
    onExit: () => void;
    xp?: number;
    roundSize?: number;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'opening' | 'starting' | 'error' | 'playing' | 'submitting' | 'result';
interface Level {
    key: string;
    label: string;
    hint: string;
    fill: string;
    ink: string;
    icon: string;
}
const LEVELS: Level[] = [
    { key: 'publico', label: 'Público', hint: 'Todos podem ver', fill: '#F9EEDC', ink: '#000000', icon: 'M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12zM12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6z' },
    { key: 'interno', label: 'Interno', hint: 'Só o grupo', fill: '#FED501', ink: '#000000', icon: 'M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20M10 11.5a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35M15.5 5.6a3 3 0 0 1 0 5.8' },
    { key: 'confidencial', label: 'Confidencial', hint: 'Poucas pessoas', fill: '#FF7101', ink: '#000000', icon: 'M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3' },
    { key: 'secreto', label: 'Secreto', hint: 'Só quem precisa', fill: '#000000', ink: '#FFFFFF', icon: 'M10.6 13.4a4 4 0 1 1-5.66 5.66 4 4 0 0 1 5.66-5.66zM10.6 13.4 20 4M17 7l2.5 2.5M15 9l2 2' },
];
/** Tempo do pergaminho voando até o escudo (igual à animação `be-f*` no CSS). */
const FLY_MS = 450;
const GAME_TITLE = 'Escudos dos Segredos';
interface FeedbackItem {
    itemId: number;
    label: string;
    correctLevel: string;
    chosenLevel: string | null;
    correct: boolean;
    explanation: string;
}
function Deco() {
    return (<>
      <span className="be-floor"/>
      <span className="be-ban l"/>
      <span className="be-ban r"/>
    </>);
}
export function DataClassify({ onExit, xp, roundSize, onFinished }: DataClassifyProps) {
    const reduceMotion = useReducedMotion() === true;
    const [phase, setPhase] = useState<Phase>('opening');
    const [errorMsg, setErrorMsg] = useState('');
    const [runId, setRunId] = useState<string | null>(null);
    const [items, setItems] = useState<DataItemView[]>([]);
    const [choices, setChoices] = useState<Record<number, string>>({});
    const [at, setAt] = useState(0);
    const [flyingTo, setFlyingTo] = useState(-1);
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const isSubmittingRef = useRef(false);
    const isStartingRef = useRef(false);
    const aliveRef = useRef(true);
    const flyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
            if (flyTimerRef.current)
                clearTimeout(flyTimerRef.current);
        };
    }, []);
    const start = useCallback(() => {
        if (isStartingRef.current)
            return;
        isStartingRef.current = true;
        setPhase('starting');
        startRun('classificacao-dados')
            .then((res) => {
            if (!aliveRef.current)
                return;
            setRunId(res.runId);
            setItems((res.payload.items as DataItemView[]) ?? []);
            setChoices({});
            setAt(0);
            setFlyingTo(-1);
            setPhase('playing');
        })
            .catch((err) => {
            if (!aliveRef.current)
                return;
            const msg = err?.response?.data?.message ?? 'Nao foi possivel iniciar a partida.';
            setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
            setPhase('error');
        })
            .finally(() => {
            isStartingRef.current = false;
        });
    }, []);
    const playAgain = () => {
        if (flyTimerRef.current)
            clearTimeout(flyTimerRef.current);
        flyTimerRef.current = null;
        setRunId(null);
        setItems([]);
        setChoices({});
        setAt(0);
        setFlyingTo(-1);
        setResult(null);
        setErrorMsg('');
        setSubmissionFailed(false);
        setPhase('opening');
    };
    const current = items[at];
    const classify = (levelIndex: number) => {
        if (phase !== 'playing' || isSubmittingRef.current || flyingTo >= 0 || !current)
            return;
        const nextChoices = { ...choices, [current.id]: LEVELS[levelIndex].key };
        const apply = () => {
            flyTimerRef.current = null;
            let next = at;
            for (let step = 1; step <= items.length; step++) {
                const candidate = (at + step) % items.length;
                if (!nextChoices[items[candidate].id]) {
                    next = candidate;
                    break;
                }
            }
            setChoices(nextChoices);
            setAt(next);
            setFlyingTo(-1);
        };
        if (reduceMotion) {
            apply();
            return;
        }
        setFlyingTo(levelIndex);
        flyTimerRef.current = setTimeout(apply, FLY_MS);
    };
    const pickItem = (index: number) => {
        if (phase !== 'playing' || isSubmittingRef.current || flyingTo >= 0)
            return;
        setAt(index);
    };
    const finish = useCallback(async () => {
        if (!runId || isSubmittingRef.current)
            return;
        const dataAnswers: DataAnswer[] = Object.entries(choices).map(([itemId, level]) => ({
            itemId: Number(itemId),
            level,
        }));
        isSubmittingRef.current = true;
        setSubmissionFailed(false);
        setPhase('submitting');
        try {
            const res = await submitRun(runId, { dataAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('A confirmação não chegou. Suas escolhas podem ter sido registradas; volte aos jogos e confira seu saldo antes de iniciar outra missão.');
            setSubmissionFailed(true);
            setPhase('error');
        }
        finally {
            isSubmittingRef.current = false;
        }
    }, [runId, choices, onFinished]);
    const artwork = getChallengeArtwork(null, 'classificacao-dados');
    const classifiedCount = Object.keys(choices).length;
    const allClassified = items.length > 0 && items.every((it) => choices[it.id]);
    const left = items.length - classifiedCount;
    const world = { world: 'esc' as const, title: GAME_TITLE, artwork, onExit, className: 'be' };
    if (phase === 'opening' || phase === 'starting') {
        return (<GameWorld {...world} deco={<Deco />}>
        <WorldOpening title={GAME_TITLE} artwork={artwork} kicker="Nº 03/04 · Proteção" steps={[
                roundSize === undefined ? 'As informações chegam à mesa, uma de cada vez.' : roundSize === 1 ? '1 informação chega à mesa, uma de cada vez.' : `${roundSize} informações chegam à mesa, uma de cada vez.`,
                'Toque no escudo que deve guardar cada uma.',
                'Mudou de ideia? Toque no bilhete embaixo do escudo.',
            ]} facts={[...(xp !== undefined ? [`${xp} XP`] : []), <CoinFact key="coin"/>, 'Sem relógio']} guide="Os segredos precisam de um guardião. Topa?" startLabel="Proteger os segredos" startSuffix="· 1 ficha" onStart={start} busy={phase === 'starting'} busyLabel="Preparando…" onExit={onExit}/>
      </GameWorld>);
    }
    if (phase === 'error') {
        return (<GameWorld {...world} deco={<Deco />}>
        <WorldState tone="error" title={submissionFailed ? 'Não foi possível confirmar a missão' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>
      </GameWorld>);
    }
    if (phase === 'submitting') {
        return (<GameWorld {...world} deco={<Deco />}>
        <WorldState title="Guardando suas escolhas" description="Só um instante. Estamos conferindo a missão."/>
      </GameWorld>);
    }
    if (phase === 'result' && result) {
        const feedbackItems = (result.feedback as {
            items?: FeedbackItem[];
        })?.items ?? [];
        const okCount = feedbackItems.filter((item) => item.correct).length;
        return (<GameWorld {...world} deco={<Deco />} celebrate>
        <WorldResult title="Segredos protegidos!" score={result.score} xp={result.xpEarned} xpText={`${okCount} de ${items.length} informações no escudo certo.`} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined} guide="Tudo guardado! Confira se cada escudo ficou certinho." onPlayAgain={playAgain} playAgainSuffix="· 1 ficha" onExit={onExit}>
          <WorldReviewList label="Resultado de cada informação">
            {feedbackItems.map((item) => {
                const levelLabel = LEVELS.find((level) => level.key === item.correctLevel)?.label ?? item.correctLevel;
                const chosenLabel = LEVELS.find((level) => level.key === item.chosenLevel)?.label ?? 'nenhum';
                return (<WorldReviewItem key={item.itemId} ok={item.correct} title={item.correct ? 'Bem protegido!' : 'Vamos escolher outro escudo'} lines={[
                        item.label,
                        `Você escolheu: ${chosenLabel}. Nível recomendado: ${levelLabel}.`,
                        item.explanation,
                    ]}/>);
            })}
          </WorldReviewList>
        </WorldResult>
      </GameWorld>);
    }
    if (items.length === 0 || !current) {
        return (<GameWorld {...world} deco={<Deco />}>
        <WorldState tone="empty" title="Nenhuma informação por aqui" description="Volte mais tarde para outra missão." onExit={onExit}/>
      </GameWorld>);
    }
    const currentLevel = choices[current.id];
    return (<GameWorld {...world} deco={<Deco />} chip={<>
          <span>{classifiedCount} de {items.length} protegidas</span>
          <WorldFlags total={items.length} done={classifiedCount}/>
        </>}>
      <div className="be-wall" role="group" aria-label="Escudos na parede">
        {LEVELS.map((level, levelIndex) => {
            const mine = items.map((item, itemIndex) => ({ item, itemIndex })).filter(({ item }) => choices[item.id] === level.key);
            const count = mine.length;
            const selected = currentLevel === level.key;
            return (<div key={level.key} className="be-col">
              <button type="button" className={`be-sh${selected ? ' on' : ''}${flyingTo === levelIndex ? ' go' : ''}`} aria-pressed={selected} aria-label={`Escudo ${level.label}: ${level.hint}. ${count} ${count === 1 ? 'guardada' : 'guardadas'}.`} onClick={() => classify(levelIndex)}>
                <svg viewBox="0 0 64 72" width="116" height="131" aria-hidden="true">
                  <path d="M32 3 6 12v18c0 18 11 31 26 39 15-8 26-21 26-39V12z" fill={level.fill} stroke="#000000" strokeWidth="3" strokeLinejoin="round"/>
                  <path d="M32 9 12 16v14c0 14 8 24 20 31" fill="none" stroke="#FFFFFF" strokeOpacity=".45" strokeWidth="2.4" strokeLinecap="round"/>
                  <g transform="translate(20 22)" fill="none" stroke={level.ink} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d={level.icon}/></g>
                </svg>
                <span className="be-cnt" aria-hidden="true">{count}</span>
                <span className="be-plate"><strong>{level.label}</strong><small>{level.hint}</small></span>
              </button>
              <div className="be-chips">
                {mine.map(({ item, itemIndex }) => (<button type="button" key={item.id} className="be-chip" aria-current={itemIndex === at ? 'true' : undefined} aria-label={`Trocar o escudo de ${item.label}`} onClick={() => pickItem(itemIndex)}>{item.label}</button>))}
              </div>
            </div>);
        })}
      </div>

      <div className="be-table">
        <WorldGuide text="Quem pode ver isso? Toque no escudo certo."/>
        <div className={`be-scroll gw-swap s${at % 2}${flyingTo >= 0 ? ` fly f${flyingTo}` : ''}`}>
          <p className="gw-k">Pergaminho {at + 1} de {items.length}</p>
          <h2>{current.label}</h2>
          <p>Toque num escudo para guardar.</p>
        </div>
        <div className="be-side">
          <WorldChip role="status" aria-live="polite">{allClassified ? 'Tudo pronto para conferir!' : (left === 1 ? 'Falta 1 escolha' : `Faltam ${left} escolhas`)}</WorldChip>
          <WorldButton variant="play" onClick={() => void finish()} disabled={!allClassified}>Entregar ao guardião</WorldButton>
        </div>
      </div>
    </GameWorld>);
}
