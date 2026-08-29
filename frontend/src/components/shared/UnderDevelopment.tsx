import { PageTransition } from "./PageTransition"
import { Construction } from "lucide-react"
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';

interface UnderDevelopmentProps {
  section: string
}

export function UnderDevelopment({ section }: UnderDevelopmentProps) {
  return (
    <PageTransition>
      <div className="app-page flex flex-col gap-5">
        <AppSectionHeader title={section} subtitle="Esta área está sendo preparada para você." />
        <InfoCard className="app-empty-card">
          <div className="app-empty-state">
            <div className="app-empty-icon"><Construction size={28} /></div>
            <h3>Novidades em breve</h3>
            <p>Estamos finalizando esta experiência seguindo o novo padrão visual da plataforma.</p>
          </div>
        </InfoCard>
      </div>
    </PageTransition>
  )
}
