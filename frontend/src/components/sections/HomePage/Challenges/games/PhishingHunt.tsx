import { useEffect, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { Check, Radar, X } from 'lucide-react';
import { startRun, submitRun, type PhishingSampleView, type PhishingAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, GameReviewItems } from '../ChallengeGameShell';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
interface PhishingHuntProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'loading' | 'error' | 'playing' | 'submitting' | 'result';
const SIGNALS: {
    key: string;
    label: string;
}[] = [
    { key: 'sender', label: 'Quem enviou parece falso' },
    { key: 'url', label: 'Endereço estranho' },
    { key: 'urgency', label: 'Pede pressa' },
    { key: 'attachment', label: 'Anexo surpresa' },
    { key: 'reward', label: 'Prêmio fácil' },
    { key: 'spelling', label: 'Palavras diferentes' },
];
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
    const reduceMotion = useReducedMotion();
    const [phase, setPhase] = useState<Phase>('loading');
    const [errorMsg, setErrorMsg] = useState('');
    const [runId, setRunId] = useState<string | null>(null);
    const [samples, setSamples] = useState<PhishingSampleView[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<PhishingAnswer[]>([]);
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const isSubmittingRef = useRef(false);
    const decidedSampleRef = useRef<number | null>(null);
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
        if (!runId || isSubmittingRef.current)
            return;
        isSubmittingRef.current = true;
        setSubmissionFailed(false);
        setPhase('submitting');
        try {
            const res = await submitRun(runId, { phishingAnswers: finalAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('A confirmação não chegou. Sua missão pode ter sido registrada; volte aos jogos e confira seu saldo antes de iniciar outra.');
            setSubmissionFailed(true);
            setPhase('error');
        }
        finally {
            isSubmittingRef.current = false;
        }
    }, [runId, onFinished]);
    const decide = (report: boolean) => {
        const current = samples[index];
        if (!current || phase !== 'playing' || isSubmittingRef.current || decidedSampleRef.current === current.id)
            return;
        decidedSampleRef.current = current.id;
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
        if (phase !== 'playing' || isSubmittingRef.current) return;
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
    return (<ChallengeGameShell title="Detetives de Mensagens" description="Leia as pistas e descubra se a mensagem é segura." artwork={getChallengeArtwork(null, 'caca-phishing')} onExit={onExit} progress={samples.length ? (answers.length / samples.length) * 100 : 0} progressLabel={samples.length ? `Mensagem ${Math.min(Math.max(index + 1, answers.length), samples.length)} de ${samples.length}` : 'Abrindo as mensagens'} className="phishing-mission">
      {phase === 'loading' && (<ChallengeGameState title="Abrindo o correio do castelo" description="Buscando as mensagens da missão."/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title={submissionFailed ? 'Não foi possível confirmar a missão' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>)}

      {phase === 'submitting' && (<ChallengeGameState title="Guardando suas escolhas" description="Só um instante. Estamos conferindo a missão."/>)}

      {phase === 'playing' && !current && (<ChallengeGameState tone="empty" title="Nenhuma mensagem por aqui" description="Volte mais tarde para outra missão." onExit={onExit}/>)}

      {phase === 'playing' && current && (<div className="phishing-mission-workspace">
          <AnimatePresence mode="wait">
            <motion.section key={current.id} className="phishing-message-console" initial={reduceMotion ? false : { opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={reduceMotion ? undefined : { opacity: 0, y: -12 }} transition={{ duration: reduceMotion ? 0 : 0.2 }}>
              <div className="phishing-console-bar">
                <strong>Mensagem {index + 1} de {samples.length}</strong>
                <span>{kindLabel[current.kind]} em análise</span>
              </div>

              <div className="phishing-message-content">
                <div className="phishing-message-metadata" role="group" aria-label="Detalhes da mensagem">
                  {current.content.sender && <div className="phishing-message-metadata-row"><span>De</span><strong>{current.content.sender}</strong></div>}
                  {current.content.subject && <div className="phishing-message-metadata-row"><span>Assunto</span><strong>{current.content.subject}</strong></div>}
                  {current.content.url && <div className="phishing-message-metadata-row"><span>Endereço</span><strong>{current.content.url}</strong></div>}
                </div>
                <div className="phishing-message-body">{current.content.body}</div>
              </div>

              <div className="phishing-signal-panel">
                <div><strong>Marque as pistas que encontrar</strong></div>
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
                <div><strong>É uma mensagem segura?</strong></div>
                <button type="button" onClick={() => decide(false)} className="is-trust" aria-label="Sim, a mensagem é segura">Sim</button>
                <button type="button" onClick={() => decide(true)} className="is-report" aria-label="Não, a mensagem é suspeita">Não</button>
              </div>
            </motion.section>
          </AnimatePresence>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Mensagens investigadas!" description={`Você analisou ${answers.length} mensagens. Veja quais pistas encontrou.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined}>
          <div className="phishing-review-list">
            <div className="phishing-review-heading"><Radar size={19}/><div><h3>O que descobrimos?</h3><p>Confira as respostas e as pistas da missão.</p></div></div>
            <GameReviewItems>
            {(result.feedback as {
                items?: FeedbackItem[];
            })?.items?.map((item, itemIndex) => {
                const ok = item.decisionRight && item.signalsRight;
                const chosen = answers.find((answer) => answer.sampleId === item.sampleId);
                const signalNames = (keys: string[]) => keys.map((key) => SIGNALS.find((signal) => signal.key === key)?.label ?? key).join(', ');
                return (<div key={item.sampleId} className={`phishing-review-row ${ok ? 'is-correct' : 'is-wrong'}`}>
                  <div>{ok ? <Check size={16}/> : <X size={16}/>}</div>
                  <span>Caso {String(itemIndex + 1).padStart(2, '0')}</span>
                  <section><strong>{ok ? 'Pistas certas!' : 'Vamos olhar de novo'}</strong><p>{item.isPhishing ? 'Mensagem suspeita' : 'Mensagem segura'}. Você marcou como {chosen?.report ? 'suspeita' : 'segura'}.</p><p>{item.explanation}</p><p>Pistas importantes: {signalNames(item.correctSignals) || 'nenhuma'}.</p></section>
                </div>);
            })}
            </GameReviewItems>
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
