import type { CSSProperties } from 'react';
import { Eye, ShieldCheck } from 'lucide-react';
import { EmpresaPaleta } from '@/services/me';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';

interface AdminThemePreviewProps {
  paleta: EmpresaPaleta;
  logoPreview: string | null;
  empresaNome: string;
  userInitial: string;
}

/**
 * Amostra do dashboard com a paleta selecionada. Componente de apresentacao:
 * nao busca dados e nao decide nada, so reflete a paleta recebida.
 */
export function AdminThemePreview({ paleta, logoPreview, empresaNome, userInitial }: AdminThemePreviewProps) {
    return (<section className="admin-settings-section admin-preview-section">
      <AppSectionHeader title="Pré-visualização" subtitle="Uma amostra do dashboard com a paleta selecionada."/>
      <InfoCard raised className="admin-preview-card">
        <InfoCard.Header title="Dashboard da empresa" icon={Eye} variant="accent"/>
        <InfoCard.Section>
          <div className="admin-interface-preview" style={{
            '--preview-primary': paleta.primary,
            '--preview-secondary': paleta.secondary,
            '--preview-accent': paleta.accent,
            '--preview-text': paleta.text_primary,
            '--preview-muted': paleta.text_secondary,
            '--preview-bg': paleta.text_primary.toUpperCase() === '#ECECEC' ? '#111827' : '#F8FAFC',
            '--preview-surface': paleta.text_primary.toUpperCase() === '#ECECEC' ? '#1E293B' : '#FFFFFF',
        } as CSSProperties}>
            <div className="admin-preview-sidebar">
              <div className="admin-preview-company-mark">
                {logoPreview ? <img src={logoPreview} alt=""/> : <ShieldCheck size={16}/>}
              </div>
              <i className="is-active"/><i /><i /><i />
            </div>
            <div className="admin-preview-workspace">
              <div className="admin-preview-header">
                <div><strong>{empresaNome || 'Sua Empresa'}</strong><span>Dashboard</span></div>
                <span className="admin-preview-avatar">{userInitial}</span>
              </div>
              <div className="admin-preview-welcome">
                <div className="admin-preview-user-icon">{userInitial}</div>
                <div><strong>Bem-vindo de volta!</strong><span>Continue sua jornada de segurança.</span></div>
              </div>
              <div className="admin-preview-cards">
                <div><span>Progresso</span><strong>72%</strong><i><b /></i></div>
                <div className="is-highlight"><span>Desafio do dia</span><strong>Blindagem de Conta</strong><button>Iniciar desafio</button></div>
              </div>
            </div>
          </div>

          <div className="admin-preview-legend">
            <div><i style={{ backgroundColor: paleta.primary }}/><span>Primária</span><code>{paleta.primary}</code></div>
            <div><i style={{ backgroundColor: paleta.secondary }}/><span>Secundária</span><code>{paleta.secondary}</code></div>
            <div><i style={{ backgroundColor: paleta.accent }}/><span>Destaque</span><code>{paleta.accent}</code></div>
          </div>
        </InfoCard.Section>
      </InfoCard>
    </section>);
}
