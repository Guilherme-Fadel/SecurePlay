import { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Eye, Flag, Globe, Mail, MessageSquare, Radar, ShieldAlert, ShieldCheck, X } from 'lucide-react';
import { startRun, submitRun, type PhishingSampleView, type PhishingAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, } from '../ChallengeGameShell';
interface PhishingHuntProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'loading' | 'error' | 'playing' | 'result';
const SIGNALS: {
    key: string;
    label: string;
}[] = [
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
    useEffect(() => {
        let alive = true;
        startRun('caca-phishing')
            .then((res) => {
            if (!alive)
                return;
            setRunId(res.runId);
            setSamples((res.payload.samples as PhishingSampleView[]) ?? []);
            setPhase('playing');
        })
            .catch((err) => {
            if (!alive)
                return;
            const msg = err?.response?.data?.message ?? 'Nao foi possivel iniciar a partida.';
            setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
            setPhase('error');
        });
        return () => {
            alive = false;
        };
    }, []);
    const finish = useCallback(async (finalAnswers: PhishingAnswer[]) => {
        if (!runId)
            return;
        try {
            const res = await submitRun(runId, { phishingAnswers: finalAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('Erro ao enviar respostas.');
            setPhase('error');
        }
    }, [runId, onFinished]);
    const decide = (report: boolean) => {
        const current = samples[index];
        if (!current)
            return;
        const next = [...answers, { sampleId: current.id, report, signals: Array.from(marked) }];
        setAnswers(next);
        setMarked(new Set());
        if (index + 1 >= samples.length) {
            finish(next);
        }
        else {
            setIndex((i) => i + 1);
        }
    };
    const toggleSignal = (key: string) => {
        setMarked((prev) => {
            const next = new Set(prev);
            if (next.has(key))
                next.delete(key);
            else
                next.add(key);
            return next;
        });
    };
    const current = samples[index];
    const KindIcon = current ? kindIcon[current.kind] : Mail;
    return (<ChallengeGameShell title="Caça ao Phishing" eyebrow="Central de triagem" description="Inspecione comunicações, marque sinais suspeitos e tome uma decisão segura." icon={ShieldAlert} onExit={onExit} progress={phase === 'result' ? 100 : samples.length ? (index / samples.length) * 100 : 0} progressLabel={samples.length ? `Caso ${Math.min(index + 1, samples.length)} de ${samples.length}` : 'Abrindo central de análise'} metrics={[
            { icon: current ? KindIcon : Mail, label: 'Canal', value: current ? kindLabel[current.kind] : '—' },
            { icon: Radar, label: 'Sinais', value: marked.size },
            { icon: Eye, label: 'Analisados', value: answers.length },
        ]} className="phishing-mission">
      {phase === 'loading' && (<ChallengeGameState title="Abrindo a central de triagem" description="Carregando comunicações para análise segura."/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title="Não foi possível iniciar" description={errorMsg} onExit={onExit}/>)}

      {phase === 'playing' && !current && (<ChallengeGameState tone="empty" title="Fila de triagem vazia" description="Nenhuma amostra está disponível no momento." onExit={onExit}/>)}

      {phase === 'playing' && current && (<div className="phishing-mission-workspace">
          <aside className="phishing-inspector-rail">
            <div className="phishing-case-emblem"><KindIcon size={30}/></div>
            <span>CASO {String(index + 1).padStart(2, '0')}</span>
            <h2>{kindLabel[current.kind]} sob análise</h2>
            <p>Observe o remetente, o contexto e a linguagem antes de liberar ou denunciar.</p>
            <div className="phishing-scan-status">
              <Radar size={18}/>
              <div><span>Marcadores ativos</span><strong>{marked.size} sinal(is)</strong></div>
            </div>
          </aside>

          <AnimatePresence mode="wait">
            <motion.section key={current.id} className="phishing-message-console" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.2 }}>
              <div className="phishing-console-bar">
                <div><i /><i /><i /></div>
                <span><KindIcon size={13}/> {kindLabel[current.kind]} recebido</span>
                <small>AMOSTRA #{current.id}</small>
              </div>

              <div className="phishing-message-content">
                <div className="phishing-message-metadata">
                  {current.content.sender && <p><span>Remetente</span><strong>{current.content.sender}</strong></p>}
                  {current.content.subject && <p><span>Assunto</span><strong>{current.content.subject}</strong></p>}
                  {current.content.url && <p><span>Endereço</span><strong>{current.content.url}</strong></p>}
                </div>
                <div className="phishing-message-body">{current.content.body}</div>
              </div>

              <div className="phishing-signal-panel">
                <div><strong>O que chamou sua atenção?</strong><span>Marcação opcional</span></div>
                <div className="phishing-signal-list">
                  {SIGNALS.map((signal) => {
                const active = marked.has(signal.key);
                return (<button key={signal.key} type="button" aria-pressed={active} onClick={() => toggleSignal(signal.key)} className={active ? 'is-active' : ''}>
                        <i>{active && <Check size={11}/>}</i>{signal.label}
                      </button>);
            })}
                </div>
              </div>

              <div className="phishing-decision-bar">
                <div><span>Decisão final</span><strong>Esta comunicação é segura?</strong></div>
                <button onClick={() => decide(false)} className="is-trust"><ShieldCheck size={18}/> Liberar</button>
                <button onClick={() => decide(true)} className="is-report"><Flag size={18}/> Denunciar</button>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Triagem concluída" description={`A central processou ${answers.length} comunicações e registrou seu diagnóstico.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined}>
          <div className="phishing-review-list">
            <div className="phishing-review-heading"><Radar size={19}/><div><h3>Relatório de triagem</h3><p>Confira o diagnóstico oficial de cada amostra.</p></div></div>
            {(result.feedback as {
                items?: FeedbackItem[];
            })?.items?.map((item, itemIndex) => {
                const ok = item.decisionRight && item.signalsRight;
                return (<div key={item.sampleId} className={`phishing-review-row ${ok ? 'is-correct' : 'is-wrong'}`}>
                  <div>{ok ? <Check size={16}/> : <X size={16}/>}</div>
                  <span>Caso {String(itemIndex + 1).padStart(2, '0')}</span>
                  <section><strong>{item.isPhishing ? 'Era phishing' : 'Era legítimo'}</strong><p>{item.explanation}</p></section>
                </div>);
            })}
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
