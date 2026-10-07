import { useEffect, useState, useCallback, useRef } from 'react';
import { Check, X } from 'lucide-react';
import { startRun, submitRun, type DataItemView, type DataAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, } from '../ChallengeGameShell';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
interface DataClassifyProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'loading' | 'error' | 'playing' | 'submitting' | 'result';
const LEVELS: {
    key: string;
    label: string;
    hint: string;
}[] = [
    { key: 'publico', label: 'Público', hint: 'Todos podem ver' },
    { key: 'interno', label: 'Interno', hint: 'Só o grupo' },
    { key: 'confidencial', label: 'Confidencial', hint: 'Poucas pessoas' },
    { key: 'secreto', label: 'Secreto', hint: 'Só quem precisa' },
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
    const [submissionFailed, setSubmissionFailed] = useState(false);
    const [result, setResult] = useState<SubmitRunResponse | null>(null);
    const isSubmittingRef = useRef(false);
    useEffect(() => {
        let alive = true;
        startRun('classificacao-dados')
            .then((res) => {
            if (!alive)
                return;
            setRunId(res.runId);
            setItems((res.payload.items as DataItemView[]) ?? []);
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
    const classify = (itemId: number, level: string) => {
        if (phase !== 'playing' || isSubmittingRef.current)
            return;
        setChoices((prev) => ({ ...prev, [itemId]: level }));
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
    const allClassified = items.length > 0 && items.every((it) => choices[it.id]);
    const classifiedCount = Object.keys(choices).length;
    return (<ChallengeGameShell title="Escudos dos Segredos" description="Escolha qual escudo protege cada informação." artwork={getChallengeArtwork(null, 'classificacao-dados')} onExit={onExit} progress={items.length ? (classifiedCount / items.length) * 100 : 0} progressLabel={items.length ? `${classifiedCount} de ${items.length} informações protegidas` : 'Preparando informações'} className="data-mission">
      {phase === 'loading' && (<ChallengeGameState title="Preparando os segredos" description="Escolhendo as informações da missão."/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title={submissionFailed ? 'Não foi possível confirmar a missão' : 'Não foi possível iniciar'} description={errorMsg} onExit={onExit}/>)}

      {phase === 'submitting' && (<ChallengeGameState title="Guardando suas escolhas" description="Só um instante. Estamos conferindo a missão."/>)}

      {phase === 'playing' && items.length === 0 && (<ChallengeGameState tone="empty" title="Nenhuma informação por aqui" description="Volte mais tarde para outra missão." onExit={onExit}/>)}

      {phase === 'playing' && items.length > 0 && (<div className="data-mission-workspace">
          <section className="data-document-console" aria-label="Missão de proteger informações">
            <header>
              <div><span>ARQUIVO DO CASTELO</span><h2>Quem pode ver cada informação?</h2></div>
              <details className="data-level-legend-disclosure">
                <summary>Ver legenda dos escudos</summary>
                <div className="data-level-legend">
                  {LEVELS.map((level) => (
                    <div key={level.key} className={`data-level-legend--${level.key}`}><strong>{level.label}</strong><span>{level.hint}</span></div>
                  ))}
                </div>
              </details>
              <strong aria-label={`${classifiedCount} de ${items.length} prontas`}>{classifiedCount}/{items.length}</strong>
            </header>

            <div className="data-document-list">
              {items.map((item, itemIndex) => (<div key={item.id} className={`data-document-row ${choices[item.id] ? 'is-classified' : ''}`}>
                  <div className="data-document-index">{String(itemIndex + 1).padStart(2, '0')}</div>
                  <div className="data-document-name"><strong>{item.label}</strong></div>
                  <div className="data-level-selector" role="group" aria-label={`Classificar ${item.label}`}>
                    {LEVELS.map((level) => {
                    const active = choices[item.id] === level.key;
                    return (<button type="button" key={level.key} onClick={() => classify(item.id, level.key)} aria-pressed={active} className={`data-level--${level.key}${active ? ' is-active' : ''}`}>
                          <span>{level.label}</span>{active && <small>Escolhido</small>}
                        </button>);
                })}
                  </div>
                </div>))}
            </div>

            <footer className="data-submit-bar">
              <div role="status" aria-live="polite"><span>Progresso da missão</span><strong>{allClassified ? 'Tudo pronto para conferir!' : `Faltam ${items.length - classifiedCount} escolhas`}</strong></div>
              <AppButton onClick={() => void finish()} disabled={!allClassified}>
                Enviar classificação
              </AppButton>
            </footer>
          </section>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Segredos protegidos!" description={`Você escolheu escudos para ${items.length} informações. Confira suas respostas.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined}>
          <div className="data-review-list">
            <div className="data-review-heading"><div><h3>Confira os escudos</h3><p>Veja se cada informação ficou bem protegida.</p></div></div>
            {(result.feedback as {
                items?: FeedbackItem[];
            })?.items?.map((item, itemIndex) => {
                const levelLabel = LEVELS.find((level) => level.key === item.correctLevel)?.label ?? item.correctLevel;
                return (<div key={item.itemId} className={`data-review-row ${item.correct ? 'is-correct' : 'is-wrong'}`}>
                  <div>{item.correct ? <Check size={16}/> : <X size={16}/>}</div>
                  <span>{String(itemIndex + 1).padStart(2, '0')}</span>
                  <section><strong>{item.correct ? 'Bem protegido!' : 'Vamos escolher outro escudo'}</strong><p>{item.label}</p><p>Você escolheu: {LEVELS.find((level) => level.key === item.chosenLevel)?.label ?? 'nenhum'}. Nível recomendado: {levelLabel}.</p><p>{item.explanation}</p></section>
                </div>);
            })}
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
