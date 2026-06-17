import { useState } from 'react';
import { ArrowLeft, ChevronLeft, ChevronRight, Info } from 'lucide-react';
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
  const [showBriefing, setShowBriefing] = useState(false);

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
        <p className="text-[var(--text-secondary)]">Carregando quadrinho...</p>
      </div>
    );
  }

  if (showQuiz) {
    return <AulaQuiz aula={aula} onBack={() => setShowQuiz(false)} onComplete={onBack} />;
  }

  return (
    <div className="relative flex flex-col h-[calc(100vh-120px)]">
      <div
        className="flex-1 min-h-0 bg-[var(--background)] rounded-2xl overflow-hidden flex items-center justify-center relative"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {pages[currentPage] && (
          <img
            src={pages[currentPage]}
            alt={`Página ${currentPage + 1}`}
            className="w-full h-full object-contain"
            loading="lazy"
          />
        )}

        <div className="absolute top-0 left-0 right-0 flex items-center justify-between p-3 bg-gradient-to-b from-black/60 to-transparent">
          <button
            onClick={onBack}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-[var(--text-primary)] hover:bg-black/70 transition-colors text-sm"
          >
            <ArrowLeft size={14} />
            Voltar
          </button>

          {aula.description && (
            <button
              onClick={() => setShowBriefing(!showBriefing)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-black/50 backdrop-blur-sm text-[var(--accent)] hover:bg-black/70 transition-colors text-sm"
            >
              <Info size={14} />
              Briefing
            </button>
          )}
        </div>

        {showBriefing && aula.description && (
          <div className="absolute top-14 left-3 right-3 p-3 rounded-xl bg-black/80 backdrop-blur-sm border border-[var(--border)]">
            <p className="text-[var(--accent)] text-xs font-semibold mb-1">Briefing</p>
            <p className="text-[var(--text-primary)] font-[var(--font-family-inter)] text-xs leading-relaxed">
              {aula.description}
            </p>
          </div>
        )}

        <button
          onClick={goPrev}
          disabled={currentPage === 0}
          className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 disabled:opacity-0 transition-all"
        >
          <ChevronLeft size={20} />
        </button>

        <button
          onClick={goNext}
          className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center text-white hover:bg-black/60 transition-all"
        >
          <ChevronRight size={20} />
        </button>

        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 px-3 py-1.5 rounded-full bg-black/50 backdrop-blur-sm">
          <span className="text-[var(--text-primary)] text-xs font-[var(--font-family-inter)]">
            {currentPage + 1}/{pages.length}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-1.5 justify-center py-2 flex-shrink-0">
        {pages.map((_, i) => (
          <button
            key={i}
            onClick={() => goTo(i)}
            className={`w-2 h-2 rounded-full transition-all duration-200 ${
              i === currentPage
                ? 'bg-[var(--primary)] scale-125'
                : i < currentPage
                  ? 'bg-[var(--accent)]'
                  : 'bg-[var(--surface-alt)]'
            }`}
          />
        ))}
      </div>
    </div>
  );
}
