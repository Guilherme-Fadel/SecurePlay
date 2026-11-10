import { useCallback, useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { startRun, submitRun, type PhishingSampleView, type PhishingAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { CoinFact, GameWorld, WorldFlags, WorldGuide, WorldOpening, WorldPaper, WorldResult, WorldReviewItem, WorldReviewList, WorldState } from '../world';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import '@/styles/games/detetives.css';
interface PhishingHuntProps {
    onExit: () => void;
    xp?: number;
    roundSize?: number;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'opening' | 'error' | 'playing' | 'submitting' | 'result';
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
const BODY_SIGNALS = ['urgency', 'attachment', 'reward', 'spelling'];
const NOTE_ROTATIONS = [-4, 3, -2, 5, -3, 2];
const STAMP_DELAY_MS = 750;
const kindLabel = { email: 'E-mail', site: 'Site', message: 'Mensagem' } as const;
const GAME_TITLE = 'Detetives de Mensagens';
interface FeedbackItem {
    sampleId: number;
    isPhishing: boolean;
    correctSignals: string[];
    decisionRight: boolean;
    signalsRight: boolean;
    explanation: string;
}
type Stamp = '' | 'safe' | 'sus';
export function PhishingHunt({ onExit, onFinished, xp, roundSize }: PhishingHuntProps) {
    const [phase, setPhase] = useState<Phase>('opening');
    const [starting, setStarting] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [runId, setRunId] = useState<string | null>(null);
    const [samples, setSamples] = useState<PhishingSampleView[]>([]);
    const [index, setIndex] = useState(0);
    const [answers, setAnswers] = useState<PhishingAnswer[]>([]);
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [marked, setMarked] = useState<Set<string>>(new Set());
    const [stamp, setStamp] = useState<Stamp>('');
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const isSubmittingRef = useRef(false);
    const isStartingRef = useRef(false);
    const stampingRef = useRef(false);
    const decidedSampleRef = useRef<number | null>(null);
    const stampTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const aliveRef = useRef(true);
    useEffect(() => {
        aliveRef.current = true;
        return () => {
            aliveRef.current = false;
            if (stampTimerRef.current)
                clearTimeout(stampTimerRef.current);
        };
    }, []);
    const begin = useCallback(() => {
        if (isStartingRef.current)
            return;
        isStartingRef.current = true;
        if (stampTimerRef.current)
            clearTimeout(stampTimerRef.current);
        stampingRef.current = false;
        decidedSampleRef.current = null;
        setStamp('');
        setStarting(true);
        startRun('caca-phishing')
            .then((res) => {
            if (!aliveRef.current)
                return;
            setRunId(res.runId);
            setSamples((res.payload.samples as PhishingSampleView[]) ?? []);
            setStarting(false);
            setPhase('playing');
        })
            .catch((err) => {
            if (!aliveRef.current)
                return;
            const msg = err?.response?.data?.message ?? 'Nao foi possivel iniciar a partida.';
            setErrorMsg(Array.isArray(msg) ? msg.join(' ') : String(msg));
            setSubmissionFailed(false);
            setStarting(false);
            setPhase('error');
        })
            .finally(() => {
            isStartingRef.current = false;
        });
    }, []);
    const playAgain = () => {
        if (stampTimerRef.current)
            clearTimeout(stampTimerRef.current);
        stampingRef.current = false;
        decidedSampleRef.current = null;
        isSubmittingRef.current = false;
        setRunId(null);
        setSamples([]);
        setIndex(0);
        setAnswers([]);
        setMarked(new Set());
        setStamp('');
        setResult(null);
        setErrorMsg('');
        setSubmissionFailed(false);
        setPhase('opening');
    };
    const finish = useCallback(async (finalAnswers: PhishingAnswer[]) => {
        if (!runId || isSubmittingRef.current)
            return;
        isSubmittingRef.current = true;
        setSubmissionFailed(false);
        setPhase('submitting');
        try {
            const res = await submitRun(runId, { phishingAnswers: finalAnswers });
            if (!aliveRef.current)
                return;
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            if (!aliveRef.current)
                return;
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
        if (!current || phase !== 'playing' || isSubmittingRef.current || stampingRef.current || decidedSampleRef.current === current.id)
            return;
        decidedSampleRef.current = current.id;
        stampingRef.current = true;
        const next = [...answers, { sampleId: current.id, report, signals: Array.from(marked) }];
        setStamp(report ? 'sus' : 'safe');
        stampTimerRef.current = setTimeout(() => {
            stampingRef.current = false;
            setStamp('');
            setAnswers(next);
            setMarked(new Set());
            if (index + 1 >= samples.length) {
                finish(next);
            }
            else {
                setIndex((i) => i + 1);
            }
        }, STAMP_DELAY_MS);
    };
    const toggleSignal = (key: string) => {
        if (phase !== 'playing' || isSubmittingRef.current || stampingRef.current)
            return;
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
    const total = samples.length;
    const caseNumber = Math.min(index + 1, Math.max(total, 1));
    const chip = phase === 'playing' && current
        ? (<>
          <span>Caso {caseNumber} de {total}</span>
          <WorldFlags total={total} done={answers.length}/>
        </>)
        : undefined;
    const markedSignals = SIGNALS.filter((signal) => marked.has(signal.key));
    const highlightBody = BODY_SIGNALS.some((key) => marked.has(key));
    const feedbackItems = (result?.feedback as {
        items?: FeedbackItem[];
    } | undefined)?.items ?? [];
    const solved = feedbackItems.filter((item) => item.decisionRight).length;
    const signalNames = (keys: string[]) => keys.map((key) => SIGNALS.find((signal) => signal.key === key)?.label ?? key).join(', ');
    return (<GameWorld world="det" title={GAME_TITLE} artwork={getChallengeArtwork(null, 'caca-phishing')} onExit={onExit} chip={chip} deco={<span className="bd-desk"/>} celebrate={phase === 'result'} className="bd">
      {phase === 'opening' && (<WorldOpening title={GAME_TITLE} artwork={getChallengeArtwork(null, 'caca-phishing')} kicker="Nº 02/04 · Investigação" steps={[
                roundSize === undefined ? 'As mensagens chegam ao mural.' : roundSize === 1 ? '1 mensagem chega ao mural.' : `${roundSize} mensagens chegam ao mural.`,
                'Marque as pistas que achar: elas viram bilhetes.',
                'Carimbe cada uma como segura ou suspeita.',
            ]} facts={[...(xp !== undefined ? [`${xp} XP`] : []), <CoinFact key="coin"/>]} guide="Pegue a lupa, detetive! Tem carta estranha chegando." startLabel="Abrir o correio" startSuffix="· 1 ficha" onStart={begin} busy={starting} busyLabel="Abrindo o correio…" onExit={onExit}/>)}

      {phase === 'error' && (<WorldState tone="error" title={submissionFailed ? 'Não foi possível confirmar a missão' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>)}

      {phase === 'submitting' && (<WorldState title="Guardando suas escolhas" description="Só um instante. Estamos conferindo a missão."/>)}

      {phase === 'playing' && !current && (<WorldState tone="empty" title="Nenhuma mensagem por aqui" description="Volte mais tarde para outra missão." onExit={onExit}/>)}

      {phase === 'playing' && current && (<div className="bd-grid">
          <div className="bd-cork">
            <article className={`bd-paper gw-swap s${index % 2}`} aria-label="Mensagem em análise">
              <span className="bd-pin" aria-hidden="true"/>
              <span className="bd-kind">{kindLabel[current.kind]} · caso {caseNumber}</span>
              <div className="bd-meta" role="group" aria-label="Detalhes da mensagem">
                {current.content.sender && <div><span>De</span><strong><span className={marked.has('sender') ? 'hl' : undefined}>{current.content.sender}</span></strong></div>}
                {current.content.subject && <div><span>Assunto</span><strong>{current.content.subject}</strong></div>}
                {current.content.url && <div><span>Endereço</span><strong><span className={marked.has('url') ? 'hl' : undefined}>{current.content.url}</span></strong></div>}
              </div>
              <p className="bd-body"><span className={highlightBody ? 'hl' : undefined}>{current.content.body}</span></p>
              {stamp === 'safe' && <span className="bd-stamp safe gw-disp" aria-hidden="true">Segura</span>}
              {stamp === 'sus' && <span className="bd-stamp sus gw-disp" aria-hidden="true">Suspeita</span>}
            </article>
            <div className="bd-notes" role="list" aria-label="Pistas no mural">
              {markedSignals.length === 0 && <p className="bd-empty">Suas pistas aparecem aqui</p>}
              {markedSignals.map((signal, noteIndex) => (<p key={signal.key} role="listitem" className="bd-note" style={{ transform: `rotate(${NOTE_ROTATIONS[noteIndex % NOTE_ROTATIONS.length]}deg)` }}>{signal.label}</p>))}
            </div>
          </div>

          <div className="bd-kit">
            <WorldGuide text="Achou algo estranho? Marque como pista e depois carimbe."/>
            <WorldPaper>
              <h2><Search size={24} strokeWidth={2.6} aria-hidden="true"/>Kit do detetive</h2>
              <div className="bd-clues" role="group" aria-label="Pistas">
                {SIGNALS.map((signal) => {
                const active = marked.has(signal.key);
                return (<button key={signal.key} type="button" aria-pressed={active} onClick={() => toggleSignal(signal.key)} className={`bd-clue${active ? ' on' : ''}`}>
                      <i aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>
                      </i>{signal.label}
                    </button>);
            })}
              </div>
            </WorldPaper>
            <p className="bd-ask">É uma mensagem segura? Escolha o carimbo.</p>
            <div className="bd-stamps">
              <button type="button" className="bd-st safe" onClick={() => decide(false)} aria-label="Carimbar como segura"><span className="h"/><span className="n"/><span className="b gw-disp">Segura</span></button>
              <button type="button" className="bd-st sus" onClick={() => decide(true)} aria-label="Carimbar como suspeita"><span className="h"/><span className="n"/><span className="b gw-disp">Suspeita</span></button>
            </div>
            <p className="sr" role="status">{stamp === 'safe' ? 'Carimbado como segura.' : stamp === 'sus' ? 'Carimbado como suspeita.' : ''}</p>
          </div>
        </div>)}

      {phase === 'result' && result && (<WorldResult title="Casos encerrados!" score={result.score} xp={result.xpEarned} xpText={`${solved} de ${feedbackItems.length || total} casos resolvidos corretamente.`} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined} guide="Bom faro! Veja o que cada mensagem escondia." onPlayAgain={playAgain} playAgainSuffix="· 1 ficha" onExit={onExit}>
          <WorldReviewList label="Resultado de cada caso">
            {feedbackItems.map((item, itemIndex) => {
                const chosen = answers.find((answer) => answer.sampleId === item.sampleId);
                return (<WorldReviewItem key={item.sampleId} ok={item.decisionRight} title={`Caso ${String(itemIndex + 1).padStart(2, '0')}: ${item.decisionRight ? 'acertou!' : 'vamos olhar de novo'}`} lines={[
                        `${item.isPhishing ? 'Mensagem suspeita' : 'Mensagem segura'}. Você marcou como ${chosen?.report ? 'suspeita' : 'segura'}.`,
                        item.explanation,
                        `Pistas importantes: ${signalNames(item.correctSignals) || 'nenhuma'}.`,
                    ]}/>);
            })}
          </WorldReviewList>
        </WorldResult>)}
    </GameWorld>);
}
