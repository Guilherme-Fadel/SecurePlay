import { useEffect, useState, useCallback } from 'react';
import { Building2, Check, Files, Globe, Layers3, Lock, Shield, X } from 'lucide-react';
import { startRun, submitRun, type DataItemView, type DataAnswer, type SubmitRunResponse, type TokenState, } from '@/services/arcade';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { ChallengeGameResult, ChallengeGameShell, ChallengeGameState, } from '../ChallengeGameShell';
interface DataClassifyProps {
    onExit: () => void;
    onFinished?: (tokens: TokenState | null) => void;
}
type Phase = 'loading' | 'error' | 'playing' | 'result';
const LEVELS: {
    key: string;
    label: string;
    icon: React.ElementType;
}[] = [
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
        setChoices((prev) => ({ ...prev, [itemId]: level }));
    };
    const finish = useCallback(async () => {
        if (!runId)
            return;
        const dataAnswers: DataAnswer[] = Object.entries(choices).map(([itemId, level]) => ({
            itemId: Number(itemId),
            level,
        }));
        try {
            const res = await submitRun(runId, { dataAnswers });
            setResult(res);
            setPhase('result');
            onFinished?.(res.tokens);
        }
        catch {
            setErrorMsg('Erro ao enviar respostas.');
            setPhase('error');
        }
    }, [runId, choices, onFinished]);
    const allClassified = items.length > 0 && items.every((it) => choices[it.id]);
    const classifiedCount = Object.keys(choices).length;
    return (<ChallengeGameShell title="Classificação de Dados" eyebrow="Controle da informação" description="Aplique o nível de proteção adequado a cada documento da fila." icon={Shield} onExit={onExit} progress={phase === 'result' ? 100 : items.length ? (classifiedCount / items.length) * 100 : 0} progressLabel={items.length ? `${classifiedCount} de ${items.length} documentos classificados` : 'Preparando documentos'} metrics={[
            { icon: Files, label: 'Documentos', value: items.length || '—' },
            { icon: Check, label: 'Classificados', value: classifiedCount },
            { icon: Layers3, label: 'Níveis', value: LEVELS.length },
        ]} className="data-mission">
      {phase === 'loading' && (<ChallengeGameState title="Organizando a fila" description="Carregando os documentos que precisam de classificação."/>)}

      {phase === 'error' && (<ChallengeGameState tone="error" title="Não foi possível iniciar" description={errorMsg} onExit={onExit}/>)}

      {phase === 'playing' && items.length === 0 && (<ChallengeGameState tone="empty" title="Fila vazia" description="Nenhum documento está disponível no momento." onExit={onExit}/>)}

      {phase === 'playing' && items.length > 0 && (<div className="data-mission-workspace">
          <aside className="data-level-rail">
            <span>PROTOCOLO DE SIGILO</span>
            <h2>Legenda de acesso</h2>
            <p>Escolha o nível considerando o impacto de uma exposição indevida.</p>
            <div className="data-level-legend">
              {LEVELS.map((level, index) => {
                const Icon = level.icon;
                return <div key={level.key}><i>{index + 1}</i><Icon size={16}/><strong>{level.label}</strong></div>;
            })}
            </div>
          </aside>

          <section className="data-document-console">
            <header>
              <div><span>FILA DE DOCUMENTOS</span><h2>Materiais aguardando decisão</h2></div>
              <strong>{classifiedCount}/{items.length}</strong>
            </header>

            <div className="data-document-list">
              {items.map((item, itemIndex) => (<div key={item.id} className={`data-document-row ${choices[item.id] ? 'is-classified' : ''}`}>
                  <div className="data-document-index">{String(itemIndex + 1).padStart(2, '0')}</div>
                  <div className="data-document-name"><Files size={17}/><strong>{item.label}</strong></div>
                  <div className="data-level-selector" aria-label={`Classificar ${item.label}`}>
                    {LEVELS.map((level) => {
                    const active = choices[item.id] === level.key;
                    const Icon = level.icon;
                    return (<button key={level.key} onClick={() => classify(item.id, level.key)} aria-pressed={active} className={active ? 'is-active' : ''}>
                          <Icon size={14}/><span>{level.label}</span>
                        </button>);
                })}
                  </div>
                </div>))}
            </div>

            <footer className="data-submit-bar">
              <div><span>Status da análise</span><strong>{allClassified ? 'Pronta para envio' : `Restam ${items.length - classifiedCount} decisões`}</strong></div>
              <AppButton onClick={finish} disabled={!allClassified} icon={<Check size={16}/>}>
                Enviar classificação
              </AppButton>
            </footer>
          </section>
        </div>)}

      {phase === 'result' && result && (<ChallengeGameResult title="Classificação concluída" description={`Você finalizou a análise de ${items.length} documentos do protocolo.`} xp={result.xpEarned} onExit={onExit} note={result.multiplier < 1
                ? `${result.playsToday}ª vez hoje: XP reduzido para ${Math.round(result.multiplier * 100)}%.`
                : undefined}>
          <div className="data-review-list">
            <div className="data-review-heading"><Layers3 size={19}/><div><h3>Auditoria das decisões</h3><p>Compare sua escolha com a classificação oficial.</p></div></div>
            {(result.feedback as {
                items?: FeedbackItem[];
            })?.items?.map((item, itemIndex) => {
                const levelLabel = LEVELS.find((level) => level.key === item.correctLevel)?.label ?? item.correctLevel;
                return (<div key={item.itemId} className={`data-review-row ${item.correct ? 'is-correct' : 'is-wrong'}`}>
                  <div>{item.correct ? <Check size={16}/> : <X size={16}/>}</div>
                  <span>{String(itemIndex + 1).padStart(2, '0')}</span>
                  <section><strong>{item.label}</strong><p>Nível correto: {levelLabel}. {item.explanation}</p></section>
                </div>);
            })}
          </div>
        </ChallengeGameResult>)}
    </ChallengeGameShell>);
}
