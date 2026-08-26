import { useEffect, useState, useCallback } from 'react';
import { motion } from 'motion/react';
import { ArrowLeft, Zap, Check, X, Lock, Shield, Building2, Globe } from 'lucide-react';
import {
  startRun,
  submitRun,
  type DataItemView,
  type DataAnswer,
  type SubmitRunResponse,
  type TokenState,
} from '@/services/arcade';

interface DataClassifyProps {
  onExit: () => void;
  onFinished?: (tokens: TokenState | null) => void;
}

type Phase = 'loading' | 'error' | 'playing' | 'result';

// Niveis de sigilo com rotulo e visual. As chaves batem com o enum do backend.
const LEVELS: { key: string; label: string; icon: React.ElementType }[] = [
  { key: 'publico', label: 'Publico', icon: Globe },
  { key: 'interno', label: 'Interno', icon: Building2 },
  { key: 'confidencial', label: 'Confidencial', icon: Shield },
  { key: 'secreto', label: 'Secreto', icon: Lock },
];

interface FeedbackItem {
  itemId: number;
  label: string;
  correctLevel: string;
  chosenLevel: string | null;
  correct: boolean;
  explanation: string;
}

export function DataClassify({ onExit, onFinished }: DataClassifyProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [items, setItems] = useState<DataItemView[]>([]);
  const [choices, setChoices] = useState<Record<number, string>>({});
  const [result, setResult] = useState<SubmitRunResponse | null>(null);
  const [startTokens, setStartTokens] = useState<TokenState | null>(null);

  useEffect(() => {
    let alive = true;
    startRun('classificacao-dados')
      .then((res) => {
        if (!alive) return;
        setStartTokens(res.tokens);
        setRunId(res.runId);
        setItems((res.payload.items as DataItemView[]) ?? []);
        setPhase('playing');
      })
      .catch((err) => {
        if (!alive) return;
        const msg = err?.response?.data?.message ?? 'Nao foi possivel iniciar a partida.';
        setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
        setPhase('error');
      });
    return () => {
      alive = false;
    };
  }, []);

  const classify = (itemId: number, level: string) => {
    setChoices((prev) => ({ ...prev, [itemId]: level }));
  };

  const finish = useCallback(async () => {
    if (!runId) return;
    const dataAnswers: DataAnswer[] = Object.entries(choices).map(([itemId, level]) => ({
      itemId: Number(itemId),
      level,
    }));
    try {
      const res = await submitRun(runId, { dataAnswers });
      setResult(res);
      setPhase('result');
      onFinished?.(startTokens);
    } catch {
      setErrorMsg('Erro ao enviar respostas.');
      setPhase('error');
    }
  }, [runId, choices, startTokens, onFinished]);

  const allClassified = items.length > 0 && items.every((it) => choices[it.id]);

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
          <p className="text-[var(--text-secondary)]">Carregando itens...</p>
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

        {phase === 'playing' && items.length === 0 && (
          <p className="text-[var(--text-secondary)]">Nenhum item disponivel no momento.</p>
        )}

        {phase === 'playing' && items.length > 0 && (
          <div className="w-full max-w-2xl">
            <p className="text-[var(--text-secondary)] text-sm text-center mb-6 font-[var(--font-family-inter)]">
              Classifique cada informacao pelo nivel de sigilo correto.
            </p>

            <div className="space-y-3 mb-6">
              {items.map((it) => (
                <div
                  key={it.id}
                  className="rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <p className="text-[var(--text-primary)] text-sm font-[var(--font-family-inter)] mb-2">
                    {it.label}
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {LEVELS.map((lvl) => {
                      const active = choices[it.id] === lvl.key;
                      const Icon = lvl.icon;
                      return (
                        <button
                          key={lvl.key}
                          onClick={() => classify(it.id, lvl.key)}
                          aria-pressed={active}
                          className={`flex items-center justify-center gap-1.5 py-2 rounded-lg border-2 text-xs font-[var(--font-family-inter)] transition-colors cursor-pointer ${
                            active
                              ? 'bg-[var(--primary-15)] border-[var(--primary)] text-[var(--primary)]'
                              : 'bg-[var(--background)] border-[var(--border)] text-[var(--text-secondary)]'
                          }`}
                        >
                          <Icon size={13} /> {lvl.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="text-center">
              <button
                onClick={finish}
                disabled={!allClassified}
                className="px-6 py-3 rounded-xl bg-[var(--primary)] text-white font-[var(--font-family-base)] tracking-wide cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {allClassified ? 'Enviar classificacao' : 'Classifique todos os itens'}
              </button>
            </div>
          </div>
        )}

        {phase === 'result' && result && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-2xl"
          >
            <div className="text-center mb-6">
              <h2 className="text-[var(--text-primary)] mb-2">Classificacao concluida</h2>
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[var(--accent-15)] border border-[var(--accent-30)]">
                <Zap size={20} className="fill-[var(--accent)] text-[var(--accent)]" />
                <span className="text-[var(--text-primary)] font-[var(--font-family-base)] text-2xl">
                  +{result.xpEarned} XP
                </span>
              </div>
              {result.multiplier < 1 && (
                <p className="text-[var(--text-secondary)] text-xs mt-2 font-[var(--font-family-inter)]">
                  {result.playsToday}a vez hoje: XP reduzido a {Math.round(result.multiplier * 100)}%.
                </p>
              )}
            </div>

            <div className="space-y-2 mb-6 max-h-72 overflow-y-auto scrollbar-thin pr-1">
              {(result.feedback as { items?: FeedbackItem[] })?.items?.map((item) => {
                const levelLabel = LEVELS.find((l) => l.key === item.correctLevel)?.label ?? item.correctLevel;
                return (
                  <div
                    key={item.itemId}
                    className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                  >
                    {item.correct ? (
                      <Check size={16} className="text-[var(--success)] mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-[var(--danger)] mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-[var(--text-primary)] text-xs font-[var(--font-family-inter)] font-semibold">
                        {item.label} — {levelLabel}
                      </p>
                      <p className="text-[var(--text-secondary)] text-xs font-[var(--font-family-inter)]">
                        {item.explanation}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="text-center">
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
