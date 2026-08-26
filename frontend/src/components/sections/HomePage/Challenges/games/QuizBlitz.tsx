import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Zap, Timer, Flame } from 'lucide-react';
import {
  startRun,
  submitRun,
  type QuizQuestion,
  type QuizAnswer,
  type SubmitRunResponse,
  type TokenState,
} from '@/services/arcade';

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
  const startTokensRef = useRef<TokenState | null>(null);

  // inicia a partida no backend (consome 1 token)
  useEffect(() => {
    let alive = true;
    startRun('quiz-relampago')
      .then((res) => {
        if (!alive) return;
        startTokensRef.current = res.tokens;
        setRunId(res.runId);
        setQuestions(res.payload.questions ?? []);
        setPhase('playing');
      })
      .catch((err) => {
        if (!alive) return;
        const msg =
          err?.response?.data?.message ??
          'Nao foi possivel iniciar a partida. Tente novamente.';
        setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
        setPhase('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const finish = useCallback(
    async (finalAnswers: QuizAnswer[]) => {
      if (!runId) return;
      try {
        const res = await submitRun(runId, { quizAnswers: finalAnswers });
        setResult(res);
        setPhase('result');
        onFinished?.(startTokensRef.current);
      } catch {
        setErrorMsg('Erro ao enviar respostas.');
        setPhase('error');
      }
    },
    [runId, onFinished],
  );

  // timer da rodada; ao zerar, encerra e submete o parcial
  useEffect(() => {
    if (phase !== 'playing') return;
    if (secondsLeft <= 0) {
      finish(answers);
      return;
    }
    const id = setInterval(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearInterval(id);
  }, [phase, secondsLeft, answers, finish]);

  const current = questions[index];

  const answer = (selectedIndex: number) => {
    if (!current) return;
    const next = [...answers, { questionId: current.id, selectedIndex }];
    setAnswers(next);
    setCombo((c) => c + 1); // feedback visual otimista; score real vem do servidor

    if (index + 1 >= questions.length) {
      finish(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const timerPct = useMemo(
    () => Math.max(0, (secondsLeft / ROUND_SECONDS) * 100),
    [secondsLeft],
  );

  return (
    <div className="flex flex-col min-h-[calc(100vh-140px)]">
      <div className="flex items-center h-8 shrink-0">
        <button
          onClick={onExit}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors cursor-pointer"
        >
          <ArrowLeft size={16} />
          <span>Voltar aos desafios</span>
        </button>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center">
        {phase === 'loading' && (
          <p className="text-[var(--text-secondary)]">Preparando a rodada...</p>
        )}

        {phase === 'error' && (
          <div className="text-center">
            <p className="text-[var(--danger)] mb-4">{errorMsg}</p>
            <button
              onClick={onExit}
              className="px-4 py-2 rounded-lg bg-[var(--surface)] border border-[var(--border)] text-[var(--text-primary)] cursor-pointer"
            >
              Voltar
            </button>
          </div>
        )}

        {phase === 'playing' && current && (
          <div className="w-full max-w-xl">
            {/* HUD: timer + combo + progresso */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-1.5 text-[var(--text-secondary)] text-sm">
                <Timer size={16} />
                <span className="font-[var(--font-family-base)]">{secondsLeft}s</span>
              </div>
              <div className="text-[var(--text-secondary)] text-xs font-[var(--font-family-inter)]">
                {index + 1} / {questions.length}
              </div>
              <div className="flex items-center gap-1.5 text-[var(--accent-text)] text-sm">
                <Flame size={16} />
                <span className="font-[var(--font-family-base)]">combo {combo}</span>
              </div>
            </div>

            {/* barra de tempo */}
            <div className="h-2 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden mb-6">
              <motion.div
                className="h-full bg-[var(--primary)]"
                animate={{ width: `${timerPct}%` }}
                transition={{ ease: 'linear', duration: 0.4 }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.2 }}
              >
                <h3 className="text-[var(--text-primary)] text-center mb-6 leading-snug">
                  {current.text}
                </h3>

                <div className="grid gap-3">
                  {current.options.map((opt, i) => (
                    <button
                      key={i}
                      onClick={() => answer(i)}
                      className="w-full text-left px-4 py-3 rounded-xl bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-primary)] hover:border-[var(--primary)] transition-colors cursor-pointer font-[var(--font-family-inter)]"
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {phase === 'result' && result && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center w-full max-w-md"
          >
            <h2 className="text-[var(--text-primary)] mb-2">Rodada concluida</h2>
            <p className="text-[var(--text-secondary)] text-sm mb-6 font-[var(--font-family-inter)]">
              Voce alcancou {result.score}% de desempenho.
            </p>

            <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--accent-15)] border border-[var(--accent-30)] mb-4">
              <Zap size={20} className="fill-[var(--accent)] text-[var(--accent)]" />
              <span className="text-[var(--text-primary)] font-[var(--font-family-base)] text-2xl">
                +{result.xpEarned} XP
              </span>
            </div>

            {result.multiplier < 1 && (
              <p className="text-[var(--text-secondary)] text-xs mb-6 font-[var(--font-family-inter)]">
                {result.playsToday}a vez hoje: XP reduzido a {Math.round(result.multiplier * 100)}%
                (base {result.xpBase}).
              </p>
            )}

            <div>
              <button
                onClick={onExit}
                className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-[var(--font-family-base)] tracking-wide cursor-pointer"
              >
                Voltar aos desafios
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
