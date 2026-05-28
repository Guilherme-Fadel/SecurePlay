import { InfoCard } from "@/components/ui/visuals/InfoCard";
import { useDashboardStats } from "@/hooks/useDashboard";
import { Award, BookOpen, BookOpenIcon, Lock, TrendingUp, Trophy } from "lucide-react";


export function ActiveTraining() {

    const iconMap: Record<string, React.ElementType> = {
    'trophy':      Trophy,
    'trending-up': TrendingUp,
    'award':       Award,
    'book':        BookOpen,
    'lock':        Lock
    };
    const { loading } = useDashboardStats();
    const activity = [{
        id: 1,
        icon: "trophy",
        iconColor: "var(--accent)",
        description: "TESTANDO DESCRIÇÃO",
        timeAgo: 10,
        xpGained: 30
     },
     {
        id: 2,
        icon: "lock",
        iconColor: "var(--secondary)",
        description: "TESTANDO DESCRIÇÃO 2",
        timeAgo: 20,
        xpGained: 50
     },
     {
        id: 3,
        icon: "award",
        iconColor: "var(--secondary)",
        description: "TESTANDO DESCRIÇÃO 3",
        timeAgo: 30,
        xpGained: 90
     }
    ];

    return(
        <InfoCard variant="primary" className="flex flex-col">
            <InfoCard.Header 
            title="Treinamentos Pendentes"
            icon={BookOpenIcon}
            variant="primary">
            </InfoCard.Header>
            <div className="flex flex-col divide-y divide-[var(--border)]">
        {loading ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Carregando...</p>
          </InfoCard.Section>
        ) : activity.length === 0 ? (
          <InfoCard.Section>
            <p className="text-[var(--text-secondary)]">Nenhuma atividade recente.</p>
          </InfoCard.Section>
        ) : (
          activity.map((item) => {
            const Icon = iconMap[item.icon];
            return (
              <div
                key={item.id}
                className="flex items-center justify-between px-4 py-3 hover:bg-[var(--primary-hover)] transition-colors rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 flex items-center justify-center rounded-lg bg-[var(--surface-alt)] text-[var(--text-secondary)] shrink-0">
                    <Icon size={15} color={item.iconColor}/>
                  </div>
                  <div>
                    <p className="text-[var(--text-primary)] leading-tight">{item.description}</p>
                    <p className="text-[var(--text-secondary)] text-xs mt-0.5">{item.timeAgo}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
        </InfoCard>
    )
}
