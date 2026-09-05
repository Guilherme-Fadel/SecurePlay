import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { useConteudos } from "@/hooks/useConteudos";
import { useSectionContext } from "@/contexts/SectionContext";
import { ChevronRight, Sparkles } from "lucide-react";
import { getModuleArtwork } from "@/lib/staticArtwork";

export function ActiveTraining() {
  const { allModulos, loading } = useConteudos();
  const { navigateToSection, navigateToContent } = useSectionContext();

  const pendingModulos = (allModulos ?? [])
    .filter((modulo) => modulo.progress < 100)
    .slice(0, 3);

  const handleClick = (moduloId?: number, nextAulaId?: number | null, hasStarted?: boolean) => {
    if (moduloId) {
      navigateToContent({ moduloId, ...(nextAulaId && hasStarted ? { aulaId: nextAulaId } : {}) });
      return;
    }
    navigateToSection('conteudos');
  };

  return (
    <InfoCard variant="primary" raised className="dashboard-training-card flex flex-col h-full min-h-0 overflow-hidden">
      <div className="dashboard-training-list flex flex-col divide-y divide-[var(--border)]">
        {loading ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Carregando...</p>
          </InfoCard.Section>
        ) : pendingModulos.length === 0 ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Todos os conteúdos foram concluídos!</p>
          </InfoCard.Section>
        ) : (
          pendingModulos.map((modulo, index) => {
            const isInProgress = modulo.progress > 0;
            return (
              <div
                key={modulo.id}
                onClick={() => handleClick(modulo.id, modulo.nextAulaId, modulo.hasStarted)}
                onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') handleClick(modulo.id, modulo.nextAulaId, modulo.hasStarted); }}
                role="button"
                tabIndex={0}
                className="dashboard-training-item flex items-center justify-between px-4 py-3 transition-colors cursor-pointer"
              >
                <span className="academy-training-order" aria-hidden="true">{String(index + 1).padStart(2, '0')}</span>
                <div className="dashboard-training-main flex min-w-0 items-center gap-3">
                  <div className="dashboard-training-icon w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-alt)] shrink-0">
                    <img src={getModuleArtwork(modulo)} alt="" aria-hidden="true" onError={(event) => { event.currentTarget.style.display = 'none'; }} />
                  </div>
                  <div className="dashboard-training-copy min-w-0">
                    <span className="academy-training-status"><Sparkles size={9} />{isInProgress ? 'Em aventura' : 'Nova missão'}</span>
                    <p className="text-[var(--text-primary)] leading-tight truncate">{modulo.title}</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                      {isInProgress
                        ? `${modulo.completedAulas}/${modulo.totalAulas} aulas · ${modulo.progress}%`
                        : `${modulo.totalAulas} aulas · Não iniciado`}
                    </p>
                    <div className="dashboard-training-progress" aria-label={`${modulo.progress}% concluído`}>
                      <span style={{ width: `${modulo.progress}%` }} />
                    </div>
                  </div>
                </div>
                <div className="dashboard-training-xp flex items-center gap-2">
                  <span>Continuar</span><ChevronRight size={13} />
                </div>
              </div>
            );
          })
        )}
      </div>
      <InfoCard.Footer className="academy-card-footer-link">
        <button type="button" className="academy-footer-action" onClick={() => handleClick()}>Ver todas as aulas <ChevronRight size={11} /></button>
      </InfoCard.Footer>
    </InfoCard>
  );
}
