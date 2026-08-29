import { useEffect, useMemo, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BrainCircuit, Flame, ListChecks, Timer, Zap } from 'lucide-react';
import { startRun, submitRun, type QuizQuestion, type QuizAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, } from '../ChallengeGameShell';
interface QuizBlitzProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
const ROUND_SECONDS = 60;
type Phase = 'loading' | 'error' | 'playing' | 'result';
export function QuizBlitz({ onExit, onFinished }: QuizBlitzProps) {
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMsg, setErrorMsg] = useState<string>('');
    const [runId, setRunId] = useState<string | null>(null);
    const [questions, setQuestions] = useState<QuizQuestion[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<QuizAnswer[]>([]);
    const [combo, setCombo] = useState(0);
    const [secondsLeft, setSecondsLeft] = useState(ROUND_SECONDS);
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    useEffect(() => {
        let alive = true;
        startRun('quiz-relampago')
            .then((res) => {
            if (!alive)
                return;
            setRunId(res.runId);
            setQuestions(res.payload.questions ?? []);
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
        if (!runId)
            return;
        try {
            const res = await submitRun(runId, { quizAnswers: finalAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('Erro ao enviar respostas.');
            setPhase('error');
        }
    }, [runId, onFinished]);
    useEffect(() => {
        if (phase !== 'playing')
            return;
        if (secondsLeft <= 0) {
            finish(answers);
            return;
        }
        const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
        return () => clearInterval(id);
    }, [phase, secondsLeft, answers, finish]);
    const current = questions[index];
    const answer = (selectedIndex: number) => {
        if (!current)
            return;
        const next = [...answers, { questionId: current.id, selectedIndex }];
        setAnswers(next);
        setCombo((c) => c + 1);
        if (index + 1 >= questions.length) {
            finish(next);
        }
        else {
            setIndex((i) => i + 1);
        }
    };
    const timerPct = useMemo(() => Math.max(0, (secondsLeft / ROUND_SECONDS) * 100), [secondsLeft]);
    return (<ChallengeGameShell title="Quiz Relâmpago" eyebrow="Protocolo de resposta rápida" description="Responda o máximo possível antes que o cronômetro chegue a zero." icon={Zap} onExit={onExit} progress={phase === 'result' ? 100 : questions.length ? (index / questions.length) * 100 : 0} progressLabel={questions.length ? `${Math.min(index + 1, questions.length)} de ${questions.length} questões` : 'Preparando rodada'} metrics={[
            { icon: Timer, label: 'Tempo', value: phase === 'playing' ? `${secondsLeft}s` : `${ROUND_SECONDS}s` },
            { icon: Flame, label: 'Combo', value: combo },
            { icon: ListChecks, label: 'Respondidas', value: answers.length },
        ]} className="quiz-mission">
      {phase === 'loading' && (<ChallengeGameState title="Preparando a rodada" description="Selecionando perguntas e sincronizando o cronômetro."/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title="Não foi possível iniciar" description={errorMsg} onExit={onExit}/>)}

      {phase === 'playing' && current && (<div className="quiz-mission-workspace">
          <aside className="quiz-pulse-panel">
            <div className="quiz-timer-dial" style={{ '--quiz-time': `${timerPct}%` } as React.CSSProperties}>
              <div><Timer size={21}/><strong>{secondsLeft}</strong><span>segundos</span></div>
            </div>
            <div className="quiz-combo-readout">
              <Flame size={18}/>
              <div><span>Sequência atual</span><strong>{combo} respostas</strong></div>
            </div>
            <p>Responda com agilidade. O resultado oficial é calculado pelo servidor ao final da rodada.</p>
          </aside>

          <section className="quiz-question-workspace">
            <AnimatePresence mode="wait">
              <motion.div key={current.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
                <span className="quiz-question-kicker"><BrainCircuit size={14}/> Questão {index + 1}</span>
                <h2>{current.text}</h2>
                <div className="quiz-answer-list">
                  {current.options.map((option, optionIndex) => (<button key={optionIndex} onClick={() => answer(optionIndex)}>
                      <span>{String.fromCharCode(65 + optionIndex)}</span>
                      <strong>{option}</strong>
                    </button>))}
                </div>
              </motion.div>
            </AnimatePresence>
          </section>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Rodada concluída" description={`Você alcançou ${result.score}% de desempenho no protocolo rápido.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}% da base de ${result.xpBase}.`
                : undefined}>
          <div className="quiz-result-analysis">
            <div className="quiz-score-dial" style={{ '--quiz-score': `${result.score}%` } as React.CSSProperties}>
              <div><strong>{result.score}%</strong><span>desempenho</span></div>
            </div>
            <h3>Análise da rodada</h3>
            <p>Você respondeu {answers.length} questões durante os {ROUND_SECONDS} segundos disponíveis.</p>
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
