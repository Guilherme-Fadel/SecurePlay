import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { useConteudos } from "@/hooks/useConteudos";
import { useSectionContext } from "@/contexts/SectionContext";
import { History, CheckCircle2 } from "lucide-react";

export function ActivityHistory() {
  const { allModulos, loading } = useConteudos();
  const { navigateToSection } = useSectionContext();

  const completedModulos = (allModulos ?? [])
    .filter((modulo) => modulo.progress === 100)
    .slice(0, 5);

  const handleClick = () => {
    navigateToSection('conteudos');
  };

  return (
    <InfoCard variant="secondary" className="flex flex-col lg:flex-1 lg:min-h-0">
      <InfoCard.Header
        title="Histórico de Atividades"
        subtitle="Conteúdos concluídos"
        icon={History}
        variant="secondary"
      />

      <div className="flex flex-col divide-y divide-[var(--border)] lg:flex-1 lg:min-h-0 lg:overflow-y-auto">
        {loading ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Carregando...</p>
          </InfoCard.Section>
        ) : completedModulos.length === 0 ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">
              Nenhum conteúdo concluído ainda. Conclua um módulo para vê-lo aqui.
            </p>
          </InfoCard.Section>
        ) : (
          completedModulos.map((modulo) => (
            <div
              key={modulo.id}
              onClick={handleClick}
              className="flex items-center justify-between px-4 py-3 hover:bg-[var(--surface-alt)] transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 flex items-center justify-center rounded-lg border bg-[var(--secondary-15)] border-[var(--secondary-30)] shrink-0">
                  <CheckCircle2 size={16} className="text-[var(--secondary)]" />
                </div>
                <div>
                  <p className="text-[var(--text-primary)] leading-tight">{modulo.title}</p>
                  <p className="text-[var(--text-secondary)] text-xs mt-0.5">
                    {modulo.totalAulas} aulas · Concluído
                  </p>
                </div>
              </div>
              <span className="text-xs text-[var(--accent-text)] font-medium shrink-0">
                +{modulo.xp_total} XP
              </span>
            </div>
          ))
        )}
      </div>
    </InfoCard>
  );
}
