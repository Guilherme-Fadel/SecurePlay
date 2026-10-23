import type { CSSProperties } from 'react';
import { EmpresaPaleta } from '@/services/me';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Eye } from 'lucide-react';
import { AdminCardHeading } from './AdminListLayout';

interface AdminThemePreviewProps {
  paleta: EmpresaPaleta;
  logoPreview: string | null;
  onLogoError: (url: string) => void;
  empresaNome: string;
  userInitial: string;
}

/**
 * Amostra do dashboard com a paleta selecionada. Componente de apresentacao:
 * nao busca dados e nao decide nada, so reflete a paleta recebida.
 */
export function AdminThemePreview({ paleta, logoPreview, onLogoError, empresaNome, userInitial }: AdminThemePreviewProps) {
    const textHex = paleta.text_primary.replace('#', '');
    const textBrightness = /^([0-9a-f]{6})$/i.test(textHex)
      ? .299 * Number.parseInt(textHex.slice(0, 2), 16) + .587 * Number.parseInt(textHex.slice(2, 4), 16) + .114 * Number.parseInt(textHex.slice(4, 6), 16)
      : 255;
    const darkSurface = textBrightness >= 128;
    return (<section className="admin-settings-section admin-preview-section">
      <InfoCard raised className="admin-preview-card">
        <AdminCardHeading title="Pré-visualização" description="Amostra do ambiente de aprendizagem com a paleta selecionada." icon={<Eye size={19} />} />
        <InfoCard.Section>
          <div className="admin-interface-preview" style={{
            '--preview-primary': paleta.primary,
            '--preview-secondary': paleta.secondary,
            '--preview-accent': paleta.accent,
            '--preview-text': paleta.text_primary,
            '--preview-muted': paleta.text_secondary,
            '--preview-bg': darkSurface ? '#111827' : '#F8FAFC',
            '--preview-surface': darkSurface ? '#1E293B' : '#FFFFFF',
        } as CSSProperties}>
            <div className="admin-preview-sidebar">
              <div className="admin-preview-company-mark">
                {logoPreview ? <img src={logoPreview} alt="" onError={() => onLogoError(logoPreview)}/> : <span aria-hidden="true">{empresaNome.charAt(0).toUpperCase() || 'S'}</span>}
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
