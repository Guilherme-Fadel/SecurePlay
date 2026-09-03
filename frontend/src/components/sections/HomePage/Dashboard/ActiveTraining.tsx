import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { useConteudos } from "@/hooks/useConteudos";
import { useSectionContext } from "@/contexts/SectionContext";
import { PlayCircle, CircleDot, ChevronRight } from "lucide-react";

export function ActiveTraining() {
  const { allModulos, loading } = useConteudos();
  const { navigateToSection } = useSectionContext();

  const pendingModulos = (allModulos ?? [])
    .filter((modulo) => modulo.progress < 100)
    .slice(0, 2);

  const handleClick = () => {
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
          pendingModulos.map((modulo) => {
            const isInProgress = modulo.progress > 0;
            const Icon = isInProgress ? PlayCircle : CircleDot;
            const iconColor = isInProgress ? "var(--secondary)" : "var(--text-secondary)";

            return (
              <div
                key={modulo.id}
                onClick={handleClick}
                className="dashboard-training-item flex items-center justify-between px-4 py-3 transition-colors cursor-pointer"
              >
                <div className="dashboard-training-main flex min-w-0 items-center gap-3">
                  <div className="dashboard-training-icon w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-alt)] shrink-0">
                    <Icon size={15} color={iconColor} />
                  </div>
                  <div className="dashboard-training-copy min-w-0">
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
        <button type="button" className="academy-footer-action" onClick={handleClick}>Ver todas as aulas <ChevronRight size={11} /></button>
      </InfoCard.Footer>
    </InfoCard>
  );
}
