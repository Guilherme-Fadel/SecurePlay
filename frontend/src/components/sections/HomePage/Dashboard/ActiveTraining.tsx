import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { useConteudos } from "@/hooks/useConteudos";
import { useSectionContext } from "@/contexts/SectionContext";
import { BookOpenIcon, PlayCircle, CircleDot } from "lucide-react";

export function ActiveTraining() {
  const { allModulos, loading } = useConteudos();
  const { navigateToSection } = useSectionContext();

  const pendingModulos = (allModulos ?? [])
    .filter((modulo) => modulo.progress < 100)
    .slice(0, 5);

  const handleClick = () => {
    navigateToSection('conteudos');
  };

  return (
    <InfoCard variant="primary" raised className="flex flex-col">
      <InfoCard.Header
        title="Conteúdos Pendentes"
        icon={BookOpenIcon}
        variant="primary"
      />
      <div className="flex flex-col divide-y divide-[var(--border)]">
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
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--primary-hover)] transition-colors rounded-lg cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-alt)] shrink-0">
                    <Icon size={15} color={iconColor} />
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] leading-tight">{modulo.title}</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                      {isInProgress
                        ? `${modulo.completedAulas}/${modulo.totalAulas} aulas · ${modulo.progress}%`
                        : `${modulo.totalAulas} aulas · Não iniciado`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--text-secondary)] font-medium">
                    {modulo.xp_total} XP
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </InfoCard>
  );
}
