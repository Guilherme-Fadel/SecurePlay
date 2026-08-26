import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, ShieldCheck, ShieldAlert, Zap, Check, X, Mail, Globe, MessageSquare } from 'lucide-react';
import {
  startRun,
  submitRun,
  type PhishingSampleView,
  type PhishingAnswer,
  type SubmitRunResponse,
  type TokenState,
} from '@/services/arcade';

interface PhishingHuntProps {
  onExit: () => void;
  onFinished?: (tokens: TokenState | null) => void;
}

type Phase = 'loading' | 'error' | 'playing' | 'result';

// Catalogo de sinais suspeitos que o jogador pode marcar. As chaves batem com o gabarito do backend.
const SIGNALS: { key: string; label: string }[] = [
  { key: 'sender', label: 'Remetente suspeito' },
  { key: 'url', label: 'Link/URL estranho' },
  { key: 'urgency', label: 'Urgencia/pressao' },
  { key: 'attachment', label: 'Anexo inesperado' },
  { key: 'reward', label: 'Premio/recompensa' },
  { key: 'spelling', label: 'Erros de escrita' },
];

const kindIcon = { email: Mail, site: Globe, message: MessageSquare } as const;
const kindLabel = { email: 'E-mail', site: 'Site', message: 'Mensagem' } as const;

interface FeedbackItem {
  sampleId: number;
  isPhishing: boolean;
  correctSignals: string[];
  decisionRight: boolean;
  signalsRight: boolean;
  explanation: string;
}

export function PhishingHunt({ onExit, onFinished }: PhishingHuntProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const [errorMsg, setErrorMsg] = useState('');
  const [runId, setRunId] = useState<string | null>(null);
  const [samples, setSamples] = useState<PhishingSampleView[]>([]);
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<PhishingAnswer[]>([]);
  const [marked, setMarked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<SubmitRunResponse | null>(null);
  const [startTokens, setStartTokens] = useState<TokenState | null>(null);

  useEffect(() => {
    let alive = true;
    startRun('caca-phishing')
      .then((res) => {
        if (!alive) return;
        setStartTokens(res.tokens);
        setRunId(res.runId);
        setSamples((res.payload.samples as PhishingSampleView[]) ?? []);
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

  const finish = useCallback(
    async (finalAnswers: PhishingAnswer[]) => {
      if (!runId) return;
      try {
        const res = await submitRun(runId, { phishingAnswers: finalAnswers });
        setResult(res);
        setPhase('result');
        onFinished?.(startTokens);
      } catch {
        setErrorMsg('Erro ao enviar respostas.');
        setPhase('error');
      }
    },
    [runId, startTokens, onFinished],
  );

  const decide = (report: boolean) => {
    const current = samples[index];
    if (!current) return;
    const next = [...answers, { sampleId: current.id, report, signals: Array.from(marked) }];
    setAnswers(next);
    setMarked(new Set());

    if (index + 1 >= samples.length) {
      finish(next);
    } else {
      setIndex((i) => i + 1);
    }
  };

  const toggleSignal = (key: string) => {
    setMarked((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const current = samples[index];
  const KindIcon = current ? kindIcon[current.kind] : Mail;

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
          <p className="text-[var(--text-secondary)]">Carregando amostras...</p>
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

        {phase === 'playing' && !current && (
          <p className="text-[var(--text-secondary)]">Nenhuma amostra disponivel no momento.</p>
        )}

        {phase === 'playing' && current && (
          <div className="w-full max-w-xl">
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">
                Amostra {index + 1} de {samples.length}
              </span>
              <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">
                <KindIcon size={14} /> {kindLabel[current.kind]}
              </span>
            </div>

            {/* barra de progresso */}
            <div className="h-1.5 w-full rounded-full bg-[var(--surface-alt)] overflow-hidden mb-6">
              <div
                className="h-full bg-[var(--primary)] transition-all"
                style={{ width: `${(index / samples.length) * 100}%` }}
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
                {/* cartao da mensagem */}
                <div className="rounded-2xl border-2 border-[var(--border)] bg-[var(--surface)] overflow-hidden mb-5">
                  <div className="px-4 py-3 border-b border-[var(--border)] bg-[var(--surface-alt)]/50">
                    {current.content.sender && (
                      <p className="text-[var(--text-primary)] text-sm font-[var(--font-family-inter)]">
                        <span className="text-[var(--text-secondary)]">De: </span>
                        {current.content.sender}
                      </p>
                    )}
                    {current.content.subject && (
                      <p className="text-[var(--text-primary)] text-sm font-[var(--font-family-inter)] font-semibold">
                        {current.content.subject}
                      </p>
                    )}
                    {current.content.url && (
                      <p className="text-[var(--primary)] text-xs font-[var(--font-family-inter)] break-all">
                        {current.content.url}
                      </p>
                    )}
                  </div>
                  <div className="px-4 py-4">
                    <p className="text-[var(--text-primary)] text-sm font-[var(--font-family-inter)] leading-relaxed">
                      {current.content.body}
                    </p>
                  </div>
                </div>

                {/* chips de sinais */}
                <p className="text-[var(--text-secondary)] text-xs mb-2 font-[var(--font-family-inter)]">
                  Marque os sinais suspeitos (opcional):
                </p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {SIGNALS.map((s) => {
                    const on = marked.has(s.key);
                    return (
                      <button
                        key={s.key}
                        type="button"
                        role="switch"
                        aria-pressed={on}
                        onClick={() => toggleSignal(s.key)}
                        className={`px-3 py-1.5 rounded-full text-xs font-[var(--font-family-inter)] border-2 transition-colors cursor-pointer ${
                          on
                            ? 'bg-[var(--secondary-15)] border-[var(--secondary)] text-[var(--secondary)]'
                            : 'bg-[var(--surface)] border-[var(--border)] text-[var(--text-secondary)]'
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>

                {/* decisao */}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => decide(false)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--success)] transition-colors cursor-pointer font-[var(--font-family-base)] tracking-wide"
                  >
                    <ShieldCheck size={18} /> Confiar
                  </button>
                  <button
                    onClick={() => decide(true)}
                    className="flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-[var(--border)] bg-[var(--surface)] text-[var(--text-primary)] hover:border-[var(--danger)] transition-colors cursor-pointer font-[var(--font-family-base)] tracking-wide"
                  >
                    <ShieldAlert size={18} /> Denunciar
                  </button>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}

        {phase === 'result' && result && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="w-full max-w-xl"
          >
            <div className="text-center mb-6">
              <h2 className="text-[var(--text-primary)] mb-2">Triagem concluida</h2>
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

            {/* feedback por amostra */}
            <div className="space-y-2 mb-6 max-h-64 overflow-y-auto scrollbar-thin pr-1">
              {(result.feedback as { items?: FeedbackItem[] })?.items?.map((item) => {
                const ok = item.decisionRight && item.signalsRight;
                return (
                  <div
                    key={item.sampleId}
                    className="flex items-start gap-2 p-3 rounded-lg bg-[var(--surface)] border border-[var(--border)]"
                  >
                    {ok ? (
                      <Check size={16} className="text-[var(--success)] mt-0.5 shrink-0" />
                    ) : (
                      <X size={16} className="text-[var(--danger)] mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="text-[var(--text-primary)] text-xs font-[var(--font-family-inter)] font-semibold">
                        {item.isPhishing ? 'Era golpe' : 'Era legitimo'}
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
