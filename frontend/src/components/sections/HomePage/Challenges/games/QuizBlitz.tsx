import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, ListChecks, X } from 'lucide-react';
import { startRun, submitRun, type QuizQuestion, type QuizAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, } from '../ChallengeGameShell';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
interface QuizBlitzProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
const ROUND_SECONDS = 60;
type Phase = 'loading' | 'empty' | 'error' | 'playing' | 'submitting' | 'result';
interface QuizFeedbackItem {
    questionId: number;
    correct: boolean;
    correctIndex: number;
}
export function QuizBlitz({ onExit, onFinished }: QuizBlitzProps) {
    const reduceMotion = useReducedMotion();
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [runId, setRunId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswer[]>([]);
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const answersRef = useRef<QuizAnswer[]>([]);
    const isSubmittingRef = useRef(false);
    const lastAnsweredQuestionRef = useRef<number | null>(null);
    const deadlineRef = useRef<number | null>(null);
    useEffect(() => {
        let alive = true;
        startRun('quiz-relampago')
            .then((res) => {
            if (!alive)
                return;
            const nextQuestions = res.payload.questions ?? [];
            setRunId(res.runId);
            setQuestions(nextQuestions);
            if (nextQuestions.length === 0) {
                setPhase('empty');
                return;
            }
            deadlineRef.current = Date.now() + ROUND_SECONDS * 1000;
            setPhase('playing');
        })
            .catch((err) => {
            if (!alive)
                return;
            const msg = err?.response?.data?.message ??
                'Nao foi possivel iniciar a partida. Tente novamente.';
            setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
            setPhase('error');
        });
        return () => {
            alive = false;
        };
    }, []);
    const finish = useCallback(async (finalAnswers: QuizAnswer[]) => {
        if (!runId || isSubmittingRef.current)
            return;
        isSubmittingRef.current = true;
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
    useEffect(() => {
        if (phase !== 'playing')
            return;
        const tick = () => {
            const remaining = Math.max(0, Math.ceil(((deadlineRef.current ?? Date.now()) - Date.now()) / 1000));
            setSecondsLeft(remaining);
            if (remaining === 0) void finish(answersRef.current);
        };
        tick();
        const id = setInterval(tick, 250);
        return () => clearInterval(id);
    }, [phase, finish]);
    const current = questions[index];
    const answer = (selectedIndex: number) => {
        if (!current || phase !== 'playing' || isSubmittingRef.current || lastAnsweredQuestionRef.current === current.id)
            return;
        lastAnsweredQuestionRef.current = current.id;
        const next = [...answers, { questionId: current.id, selectedIndex }];
        answersRef.current = next;
        setAnswers(next);
        if (index + 1 >= questions.length) {
            finish(next);
        }
        else {
            setIndex((i) => i + 1);
        }
    };
    const timerPct = useMemo(() => Math.max(0, (secondsLeft / ROUND_SECONDS) * 100), [secondsLeft]);
    return (<ChallengeGameShell title="Quiz Relâmpago" description="Toque numa resposta e ganhe pontos antes do tempo acabar." artwork={getChallengeArtwork(null, 'quiz-relampago')} onExit={onExit} progress={questions.length ? (answers.length / questions.length) * 100 : 0} progressLabel={questions.length ? `${Math.min(Math.max(index + 1, answers.length), questions.length)} de ${questions.length} perguntas` : 'Preparando rodada'} metrics={[
            { icon: ListChecks, label: 'Respondidas', value: answers.length },
        ]} className={`quiz-mission${phase === 'playing' ? ' is-playing' : ''}`}>
      {phase === 'loading' && (<ChallengeGameState title="Preparando a rodada" description="Aguarde enquanto as perguntas são embaralhadas."/>)}

      {phase === 'empty' && (<ChallengeGameState tone="empty" title="As perguntas estão a caminho" description="Volte aos jogos e tente esta aventura mais tarde." onExit={onExit}/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title={submissionFailed ? 'Não foi possível confirmar a rodada' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>)}

      {phase === 'submitting' && (<ChallengeGameState title="Conferindo suas respostas" description="Só um instante. Estamos guardando sua rodada."/>)}

      {phase === 'playing' && current && (<div className="quiz-mission-workspace">
          <section className="quiz-question-workspace">
            <AnimatePresence mode="wait">
              <motion.div className="quiz-question-layout" key={current.id} initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
                <div className="quiz-question-top">
                  <div className="quiz-run-strip" role="group" aria-label="Tempo da rodada">
                    <strong>{secondsLeft} segundos</strong>
                    <div className="quiz-run-track" role="progressbar" aria-label="Tempo restante" aria-valuenow={secondsLeft} aria-valuemin={0} aria-valuemax={ROUND_SECONDS}><span style={{ width: `${timerPct}%` }}/></div>
                  </div>
                  <span className="quiz-question-kicker">Questão {index + 1} de {questions.length}</span>
                </div>
                <div className="quiz-question-main">
                  <h2>{current.text}</h2>
                  <div className="quiz-answer-list">
                    {current.options.map((option, optionIndex) => (<button type="button" key={optionIndex} onClick={() => answer(optionIndex)}>
                        <span>{String.fromCharCode(65 + optionIndex)}</span>
                        <strong>{option}</strong>
                      </button>))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Rodada concluída" description={`Você fez ${result.score} pontos na rodada. Veja como foram suas respostas.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}% da base de ${result.xpBase}.`
                : undefined}>
          <div className="quiz-result-analysis">
            <div className="quiz-score-dial" style={{ '--quiz-score': `${result.score}%` } as React.CSSProperties}>
              <div><strong>{result.score}</strong><span>pontos</span></div>
            </div>
            <h3>Como foi sua aventura?</h3>
            <p>Você respondeu {answers.length} perguntas. Confira suas escolhas.</p>
            <ol className="quiz-result-review" aria-label="Resultado de cada pergunta">
              {(result.feedback as { items?: QuizFeedbackItem[] })?.items?.map((item, itemIndex) => {
                const question = questions.find((candidate) => candidate.id === item.questionId);
                if (!question) return null;
                const selected = answers.find((candidate) => candidate.questionId === item.questionId)?.selectedIndex;
                return <li key={item.questionId} className={item.correct ? 'is-correct' : 'is-wrong'}>
                  <span className="quiz-result-mark" aria-hidden="true">{item.correct ? <Check size={15} /> : <X size={15} />}</span>
                  <div>
                    <strong>Pergunta {itemIndex + 1}: {item.correct ? 'Acertou!' : 'Vamos aprender com essa.'}</strong>
                    <p>{question.text}</p>
                    <p>Sua resposta: {selected === undefined ? 'sem resposta' : question.options[selected]}.</p>
                    {!item.correct && <p>Resposta certa: {question.options[item.correctIndex]}.</p>}
                  </div>
                </li>;
              })}
            </ol>
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
