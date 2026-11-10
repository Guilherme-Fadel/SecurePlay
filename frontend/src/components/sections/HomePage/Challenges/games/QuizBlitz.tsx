import { useCallback, useEffect, useRef, useState } from 'react';
import { startRun, submitRun, type QuizAnswer, type QuizQuestion, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { CoinFact, GameWorld, WorldFlags, WorldGuide, WorldOpening, WorldResult, WorldReviewItem, WorldReviewList, WorldState, } from '../world';
import '@/styles/games/quiz.css';
interface QuizBlitzProps {
    onExit: () => void;
    xp?: number;
    roundSize?: number;
    onFinished?: (tokens: TokenState | null) => void;
}
const ROUND_SECONDS = 60;
const COUNTDOWN_STEP_MS = 700;
const HIT_MS = 400;
const LAMPS = 12;
const LETTERS = 'ABCD';
type Phase = 'opening' | 'starting' | 'empty' | 'error' | 'countdown' | 'playing' | 'submitting' | 'result';
interface QuizFeedbackItem {
    questionId: number;
    correct: boolean;
    correctIndex: number;
}
interface Bulb {
    x: string;
    y: string;
    alt: boolean;
}
/** Lâmpadas no meio da faixa de 30px da moldura (centro a 15px da borda); cantos no arco de raio 40. */
function buildBulbs(nx: number, ny: number): Bulb[] {
    const out: {
        x: string;
        y: string;
    }[] = [];
    const along = (t: number) => `calc(58px + (100% - 116px) * ${t.toFixed(4)})`;
    for (let k = 0; k < nx; k++)
        out.push({ x: along(k / (nx - 1)), y: '15px' });
    out.push({ x: 'calc(100% - 22px)', y: '22px' });
    for (let k = 0; k < ny; k++)
        out.push({ x: 'calc(100% - 15px)', y: along(k / (ny - 1)) });
    out.push({ x: 'calc(100% - 22px)', y: 'calc(100% - 22px)' });
    for (let k = nx - 1; k >= 0; k--)
        out.push({ x: along(k / (nx - 1)), y: 'calc(100% - 15px)' });
    out.push({ x: '22px', y: 'calc(100% - 22px)' });
    for (let k = ny - 1; k >= 0; k--)
        out.push({ x: '15px', y: along(k / (ny - 1)) });
    out.push({ x: '22px', y: '22px' });
    return out.map((b, j) => ({ ...b, alt: j % 2 === 1 }));
}
const BULBS = buildBulbs(14, 5);
const STAGE_DECO = (<>
    <span className="bq-spot l"/>
    <span className="bq-spot r"/>
    <span className="bq-floor"/>
    <span className="bq-curt l"/>
    <span className="bq-curt r"/>
    <span className="bq-val"/>
  </>);
const ARTWORK = getChallengeArtwork(null, 'quiz-relampago');
export function QuizBlitz({ onExit, xp, roundSize, onFinished }: QuizBlitzProps) {
    const [phase, setPhase] = useState<Phase>('opening');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [runId, setRunId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswer[]>([]);
    const [hit, setHit] = useState<number | null>(null);
    const [countdown, setCountdown] = useState(3);
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const answersRef = useRef<QuizAnswer[]>([]);
    const isSubmittingRef = useRef(false);
    const finishedRef = useRef(false);
    const startingRef = useRef(false);
    const lastAnsweredQuestionRef = useRef<number | null>(null);
    const deadlineRef = useRef<number | null>(null);
    const aliveRef = useRef(true);
    const countdownTimersRef = useRef<number[]>([]);
    const hitTimerRef = useRef<number | null>(null);
    const clearTimers = useCallback(() => {
        countdownTimersRef.current.forEach((id) => window.clearTimeout(id));
        countdownTimersRef.current = [];
        if (hitTimerRef.current !== null) {
            window.clearTimeout(hitTimerRef.current);
            hitTimerRef.current = null;
        }
    }, []);
    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
            clearTimers();
        };
    }, [clearTimers]);
    const finish = useCallback(async (finalAnswers: QuizAnswer[]) => {
        if (!runId || isSubmittingRef.current || finishedRef.current)
            return;
        isSubmittingRef.current = true;
        finishedRef.current = true;
        if (hitTimerRef.current !== null) {
            window.clearTimeout(hitTimerRef.current);
            hitTimerRef.current = null;
        }
        setHit(null);
        setSubmissionFailed(false);
        setPhase('submitting');
        try {
            const res = await submitRun(runId, { quizAnswers: finalAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('A confirmação não chegou. Sua rodada pode ter sido registrada; volte aos jogos e confira seu saldo antes de iniciar outra.');
            setSubmissionFailed(true);
            setPhase('error');
        }
        finally {
            isSubmittingRef.current = false;
        }
    }, [runId, onFinished]);
    const finishRef = useRef(finish);
    useEffect(() => {
        finishRef.current = finish;
    }, [finish]);
    const runCountdown = useCallback(() => {
        clearTimers();
        setCountdown(3);
        setPhase('countdown');
        [2, 1, 0].forEach((n, k) => {
            countdownTimersRef.current.push(window.setTimeout(() => setCountdown(n), COUNTDOWN_STEP_MS * (k + 1)));
        });
        // O relógio de 60 s só começa depois do "Vai!".
        countdownTimersRef.current.push(window.setTimeout(() => {
            deadlineRef.current = Date.now() + ROUND_SECONDS * 1000;
            setSecondsLeft(ROUND_SECONDS);
            setPhase('playing');
        }, COUNTDOWN_STEP_MS * 4));
    }, [clearTimers]);
    const begin = useCallback(() => {
        if (startingRef.current)
            return;
        startingRef.current = true;
        setPhase('starting');
        startRun('quiz-relampago')
            .then((res) => {
            if (!aliveRef.current)
                return;
            const nextQuestions = res.payload.questions ?? [];
            setRunId(res.runId);
            setQuestions(nextQuestions);
            if (nextQuestions.length === 0) {
                setPhase('empty');
                return;
            }
            runCountdown();
        })
            .catch((err) => {
            if (!aliveRef.current)
                return;
            const msg = err?.response?.data?.message ??
                'Nao foi possivel iniciar a partida. Tente novamente.';
            setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
            setSubmissionFailed(false);
            setPhase('error');
        })
            .finally(() => {
            startingRef.current = false;
        });
    }, [runCountdown]);
    /** "Jogar de novo": volta para a abertura com tudo zerado (a ficha só é gasta ao subir no palco). */
    const playAgain = () => {
        clearTimers();
        answersRef.current = [];
        isSubmittingRef.current = false;
        finishedRef.current = false;
        startingRef.current = false;
        lastAnsweredQuestionRef.current = null;
        deadlineRef.current = null;
        setRunId(null);
        setQuestions([]);
        setIndex(0);
        setAnswers([]);
        setHit(null);
        setCountdown(3);
        setSecondsLeft(ROUND_SECONDS);
        setResult(null);
        setSubmissionFailed(false);
        setErrorMsg('');
        setPhase('opening');
    };
    useEffect(() => {
        if (phase !== 'playing')
            return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (remaining === 0)
                void finish(answersRef.current);
        };
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [phase, finish]);
    const current = questions[index];
    const answer = (selectedIndex: number) => {
        if (!current || phase !== 'playing' || isSubmittingRef.current || finishedRef.current || lastAnsweredQuestionRef.current === current.id)
            return;
        if ((deadlineRef.current ?? 0) <= Date.now())
            return;
        lastAnsweredQuestionRef.current = current.id;
        const next = [...answersRef.current, { questionId: current.id, selectedIndex }];
        answersRef.current = next;
        setAnswers(next);
        setHit(selectedIndex);
        const isLast = index + 1 >= questions.length;
        hitTimerRef.current = window.setTimeout(() => {
            hitTimerRef.current = null;
            if (!aliveRef.current || finishedRef.current)
                return;
            setHit(null);
            if (isLast) {
                void finishRef.current(next);
            }
            else {
                setIndex((i) => i + 1);
            }
        }, HIT_MS);
    };
    const total = questions.length;
    const questionNumber = Math.min(index + 1, Math.max(total, 1));
    const feedbackItems = (result?.feedback as {
        items?: QuizFeedbackItem[];
    } | undefined)?.items ?? [];
    const okCount = feedbackItems.filter((item) => item.correct).length;
    const chip = phase === 'playing' && current ? (<>
        <span>Pergunta {questionNumber} de {total}</span>
        <WorldFlags total={total} done={index}/>
      </>) : undefined;
    return (<GameWorld world="quiz" title="Quiz Relâmpago" artwork={ARTWORK} onExit={onExit} className="bq" deco={STAGE_DECO} celebrate={phase === 'result'} chip={chip}>
      {(phase === 'opening' || phase === 'starting') && (<WorldOpening title="Quiz Relâmpago" artwork={ARTWORK} kicker="Nº 01/04 · Desafio" steps={[
                roundSize === undefined ? 'As perguntas aparecem no telão do palco.' : roundSize === 1 ? '1 pergunta aparece no telão do palco.' : `${roundSize} perguntas aparecem no telão do palco.`,
                'Toque na resposta que você acha certa.',
                `As lâmpadas apagam em ${ROUND_SECONDS} segundos. Corra!`,
            ]} facts={[xp !== undefined ? `${xp} XP` : null, <CoinFact key="coin"/>].filter((fact) => fact !== null)} guide="Eu fico na plateia torcendo por você!" startLabel="Subir no palco" startSuffix="· 1 ficha" onStart={begin} busy={phase === 'starting'} busyLabel="Preparando a rodada…" onExit={onExit}/>)}

      {phase === 'empty' && (<WorldState tone="empty" title="As perguntas estão a caminho" description="Volte aos jogos e tente esta aventura mais tarde." onExit={onExit}/>)}

      {phase === 'error' && (<WorldState tone="error" title={submissionFailed ? 'Não foi possível confirmar a rodada' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>)}

      {phase === 'submitting' && (<WorldState title="Conferindo suas respostas" description="Só um instante. Estamos guardando sua rodada."/>)}

      {phase === 'countdown' && (<div className="bq-cd" role="status" aria-live="assertive">
          <div className="bq-cd-ring"><span className="gw-disp" key={countdown}>{countdown > 0 ? countdown : 'Vai!'}</span></div>
          <p className="gw-k">Luzes no palco…</p>
        </div>)}

      {phase === 'playing' && current && (<>
          <div className="bq-grid">
            <WorldGuide variant="col" text="Valendo! Toque na sua resposta."/>
            <div className="bq-marq">
              {BULBS.map((bulb, bulbIndex) => (<i key={bulbIndex} className={`bq-bulb${bulb.alt ? ' b' : ''}`} style={{ left: bulb.x, top: bulb.y }} aria-hidden="true"/>))}
              <div className={`bq-board gw-swap s${index % 2}`}>
                <div className="bq-top">
                  <span className="gw-k">Pergunta {questionNumber} de {total}</span>
                  <ol className="bq-lamps" aria-hidden="true">
                    {Array.from({ length: LAMPS }, (_, lamp) => (<li key={lamp} className={lamp < Math.ceil(secondsLeft / 5) ? 'on' : undefined}/>))}
                  </ol>
                </div>
                <h1 className="bq-q" aria-live="polite">{current.text}</h1>
              </div>
            </div>
            <div className="bq-score">
              <div className={secondsLeft <= 10 ? 'low' : undefined} role="timer" aria-label={secondsLeft === 1 ? '1 segundo restante' : `${secondsLeft} segundos restantes`}>
                <small>Tempo</small><b>{secondsLeft}</b><span>segundos</span>
              </div>
              <div><small>Respondidas</small><b>{answers.length}</b><span>de {total}</span></div>
            </div>
          </div>
          <div className="bq-pods" role="group" aria-label="Respostas">
            {current.options.map((option, optionIndex) => (<button type="button" key={optionIndex} className={`bq-pod p${optionIndex % 4}${hit === optionIndex ? ' hit' : ''}`} onClick={() => answer(optionIndex)} aria-label={`Resposta ${LETTERS[optionIndex] ?? optionIndex + 1}: ${option}`}>
                <b aria-hidden="true">{LETTERS[optionIndex] ?? optionIndex + 1}</b>
                <span>{option}</span>
              </button>))}
          </div>
        </>)}

      {phase === 'result' && result && (<WorldResult title="Show encerrado!" score={result.score} xp={result.xpEarned} xpText={`${okCount} de ${total} respostas certas.`} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}% da base de ${result.xpBase}.`
                : undefined} guide="Mandou bem! Vamos ver o que aprendemos." onPlayAgain={playAgain} playAgainSuffix="· 1 ficha" onExit={onExit}>
          <WorldReviewList>
            {feedbackItems.map((item, itemIndex) => {
                const question = questions.find((candidate) => candidate.id === item.questionId);
                if (!question)
                    return null;
                const selected = answers.find((candidate) => candidate.questionId === item.questionId)?.selectedIndex;
                const lines = [
                    question.text,
                    `Sua resposta: ${selected === undefined ? 'sem resposta' : question.options[selected]}.`,
                ];
                if (!item.correct)
                    lines.push(`Resposta certa: ${question.options[item.correctIndex]}.`);
                return (<WorldReviewItem key={item.questionId} ok={item.correct} title={`Pergunta ${itemIndex + 1}: ${item.correct ? 'acertou!' : 'vamos aprender com essa.'}`} lines={lines}/>);
            })}
          </WorldReviewList>
        </WorldResult>)}
    </GameWorld>);
}
