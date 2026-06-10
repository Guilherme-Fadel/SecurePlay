import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Radio, BookOpen } from 'lucide-react';
import { useAula } from '@/hooks/useAula';
import { usePageNavigation } from '@/hooks/usePageNavigation';
import { AulaQuiz } from './AulaQuiz';

interface AulaQuadrinhoProps {
  aulaId: number;
  moduloId: number;
  onBack: () => void;
}

export function AulaQuadrinho({ aulaId, onBack }: AulaQuadrinhoProps) {
  const { aula, loading } = useAula(aulaId);
  const [showQuiz, setShowQuiz] = useState(false);

  const pages = aula?.pages || [];
  const hasQuiz = (aula?.quiz?.length ?? 0) > 0;

  const { currentPage, isLastPage, goNext, goPrev, goTo, handleTouchStart, handleTouchEnd } =
    usePageNavigation({
      totalPages: pages.length,
      onLastPage: hasQuiz ? () => setShowQuiz(true) : undefined,
    });

  if (loading || !aula) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)] text-xl">Carregando quadrinho...</p>
      </div>
    );
  }

  if (showQuiz) {
    return <AulaQuiz aula={aula} onBack={() => setShowQuiz(false)} onComplete={onBack} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)]">
        <button onClick={onBack} className="hover:text-[var(--accent)] transition-colors flex items-center gap-1">
          <ArrowLeft size={14} />
          Voltar
        </button>
        <span>/</span>
        <span className="text-[var(--text-primary)]">{aula.title}</span>
      </div>

      {aula.description && (
        <div className="bg-[var(--surface)] border-4 border-[var(--primary)] p-4" style={{ boxShadow: '4px 4px 0 rgba(105,0,255,0.3)' }}>
          <div className="flex items-start gap-3">
            <Radio size={24} className="text-[var(--primary)] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-lg text-[var(--accent)] mb-1">Briefing</p>
              <p className="text-sm text-[var(--text-primary)] font-[var(--font-family-inter)] leading-relaxed">
                {aula.description}
              </p>
            </div>
          </div>
        </div>
      )}

      <div
        className="bg-[var(--background)] border-4 border-[var(--border)] overflow-hidden"
        style={{ boxShadow: '4px 4px 0 rgba(0,0,0,0.5)' }}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative w-full aspect-[4/3] bg-[var(--surface)] flex items-center justify-center">
          {pages[currentPage] ? (
            <img
              src={pages[currentPage]}
              alt={`Página ${currentPage + 1}`}
              className="w-full h-full object-contain"
              loading="lazy"
            />
          ) : (
            <div className="text-center">
              <BookOpen size={48} className="text-[var(--text-secondary)] mx-auto mb-2" />
              <p className="text-[var(--text-secondary)]">Página não disponível</p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-4 bg-[var(--surface)] border-t-4 border-[var(--border)]">
          <button
            onClick={goPrev}
            disabled={currentPage === 0}
            className="flex items-center gap-1 px-4 py-2 bg-[var(--surface-alt)] border-2 border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] disabled:opacity-30 transition-colors"
          >
            <ChevronLeft size={16} />
            <span className="text-lg">Anterior</span>
          </button>

          <div className="flex items-center gap-2">
            <span className="text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)]">Página</span>
            <span className="px-3 py-1 bg-[var(--primary)] text-white text-sm border-2 border-[var(--accent)]">
              {currentPage + 1}/{pages.length}
            </span>
          </div>

          <button
            onClick={goNext}
            className="flex items-center gap-1 px-4 py-2 bg-[var(--accent)] border-2 border-[#6a7a03] text-[var(--background)] hover:opacity-90 transition-opacity"
          >
            <span className="text-lg">{isLastPage ? 'Quiz' : 'Próxima'}</span>
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-1.5 justify-center flex-wrap">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-3 h-3 border-2 transition-all ${
              i === currentPage
                ? 'bg-[var(--primary)] border-[var(--accent)]'
                : i < currentPage
                  ? 'bg-[var(--accent)] border-[#6a7a03]'
                  : 'bg-[var(--surface-alt)] border-[var(--border)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
