import { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, Sparkles } from 'lucide-react';
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
        <p className="text-[var(--text-secondary)] text-xl">Carregando aula...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)]">
        <button onClick={onBack} className="hover:text-[var(--accent)] transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Voltar
        </button>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{aula.title}</span>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 flex flex-col gap-4">
          <div className="relative bg-black border-4 border-[var(--border)] aspect-video" style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}>
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

          <div className="bg-[var(--surface)] border-2 border-[var(--border)] p-4">
            <h2 className="text-2xl text-[var(--text-primary)] mb-2">{aula.title}</h2>
            {aula.description && (
              <p className="text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)] leading-relaxed">
                {aula.description}
              </p>
            )}
            <div className="flex items-center gap-4 mt-4">
              <span className="text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)]">
                {aula.duration} min
              </span>
              <span className="text-sm text-[var(--accent)]">{aula.xp} XP</span>
            </div>
          </div>

          {!aula.completed && !xpGanho && (
            <button
              onClick={handleConcluir}
              disabled={concluding}
              className="w-full py-3 bg-[var(--accent)] text-[var(--background)] text-xl border-4 border-[#6a7a03] hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ boxShadow: '4px 4px 0 #6a7a03' }}
            >
              <CheckCircle size={20} />
              {concluding ? 'Concluindo...' : 'Concluir Aula'}
            </button>
          )}

          {xpGanho && (
            <div className="w-full py-3 bg-[var(--surface)] border-4 border-[var(--accent)] text-center flex items-center justify-center gap-2" style={{ boxShadow: '4px 4px 0 var(--accent)' }}>
              <Sparkles size={20} className="text-[var(--accent)]" />
              <span className="text-2xl text-[var(--accent)]">+{xpGanho} XP</span>
            </div>
          )}

          {aula.completed && !xpGanho && (
            <div className="w-full py-3 bg-[var(--surface)] border-4 border-[var(--accent)] text-center opacity-70 flex items-center justify-center gap-2">
              <CheckCircle size={18} className="text-[var(--accent)]" />
              <span className="text-xl text-[var(--accent)]">Aula concluída</span>
            </div>
          )}
        </div>

        <div className="lg:w-80 flex flex-col gap-2">
          <h3 className="text-lg text-[var(--text-primary)] mb-2">Fases do Módulo</h3>
          <div className="flex flex-col gap-2 max-h-[500px] overflow-y-auto">
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
        </div>
      </div>
    </div>
  );
}
