import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { useAula } from '@/hooks/useAula';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { useModulo } from '@/hooks/useModulo';
import { AulaListItem } from './AulaListItem';

interface AulaVideoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
  onTypeResolved?: (type: 'video' | 'quadrinho') => void;
}

export function AulaVideo({ aulaId, moduloId, onBack, onTypeResolved }: AulaVideoProps) {
  const { aula, setAula, loading } = useAula(aulaId);
  const [xpGanho, setXpGanho] = useState<number | null>(null);
  const { concluir, loading: concluding } = useAulaProgress();
  const { modulo } = useModulo(moduloId);

  useEffect(() => {
    if (aula && onTypeResolved && aula.type === 'quadrinho') {
      onTypeResolved('quadrinho');
    }
  }, [aula, onTypeResolved]);

  const handleConcluir = async () => {
    const result = await concluir(aulaId);
    if (result) {
      setXpGanho(result.xp_ganho);
      setAula((prev) => prev ? { ...prev, completed: true } : prev);
    }
  };

  if (loading || !aula) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)]">Carregando aula...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6">
      <button onClick={onBack} className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors w-fit">
        <ArrowLeft size={16} />
        <span>Voltar ao módulo</span>
      </button>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <InfoCard className="overflow-hidden">
            <div className="relative aspect-video bg-black rounded-t-2xl overflow-hidden">
              {aula.content_url ? (
                <video controls className="w-full h-full" src={aula.content_url}>
                  Seu navegador não suporta vídeo.
                </video>
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <p className="text-[var(--text-secondary)]">Vídeo não disponível</p>
                </div>
              )}
            </div>

            <InfoCard.Section>
              <h3 className="text-[var(--text-primary)] mb-2">{aula.title}</h3>
              {aula.description && (
                <p className="text-[var(--text-secondary)] font-[var(--font-family-inter)] text-sm leading-relaxed">
                  {aula.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-3 text-xs font-[var(--font-family-inter)]">
                <span className="text-[var(--text-secondary)]">{aula.duration} min</span>
                <span className="text-[var(--accent)] font-semibold">{aula.xp} XP</span>
              </div>
            </InfoCard.Section>
          </InfoCard>

          {!aula.completed && !xpGanho && (
            <button
              onClick={handleConcluir}
              disabled={concluding}
              className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--text-primary)] font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <CheckCircle size={18} />
              {concluding ? 'Concluindo...' : 'Concluir Aula'}
            </button>
          )}

          {xpGanho && (
            <InfoCard variant="accent">
              <InfoCard.Section className="text-center py-3 flex items-center justify-center gap-2">
                <Sparkles size={18} className="text-[var(--accent)]" />
                <span className="text-[var(--accent)] font-semibold">+{xpGanho} XP</span>
              </InfoCard.Section>
            </InfoCard>
          )}

          {aula.completed && !xpGanho && (
            <InfoCard variant="accent" className="opacity-70">
              <InfoCard.Section className="text-center py-3 flex items-center justify-center gap-2">
                <CheckCircle size={16} className="text-[var(--accent)]" />
                <span className="text-[var(--accent)]">Aula concluída</span>
              </InfoCard.Section>
            </InfoCard>
          )}
        </div>

        <div className="lg:w-80 flex flex-col gap-2">
          <InfoCard>
            <InfoCard.Header title="Fases do Módulo" variant="primary" />
            <div className="flex flex-col gap-2 p-3 max-h-[300px] lg:max-h-[500px] overflow-y-auto">
              {modulo?.aulas.map((a) => (
                <AulaListItem
                  key={a.id}
                  aula={a}
                  onClick={() => {
                    if (a.id !== aulaId) {
                      window.location.reload();
                    }
                  }}
                />
              ))}
            </div>
          </InfoCard>
        </div>
      </div>
    </div>
  );
}
