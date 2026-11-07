import { RotateCcw } from 'lucide-react';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useAchievementShop } from '@/hooks/useAchievements';
import { useSectionContext } from '@/contexts/SectionContext';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { ProfileIdentity } from './ProfileIdentity';
import { ProfileAccount } from './ProfileAccount';
import { ProfileSecurity } from './ProfileSecurity';
import { ProfileNextStep, ProfileProgress } from './ProfileProgress';
import { isManagementRole, profileDisplayName } from './profileModel';
import '@/styles/cosmetics.css';
import '@/styles/profile-ui.css';

/** Moldura equipada, no mesmo modelo do avatar do trilho (UserMenu) e do provador. */
function useEquippedFrame(enabled: boolean) {
  const { data: cosmeticShop } = useAchievementShop(enabled);
  return cosmeticShop?.equipped.find((item) => item.type === 'frame')?.visualValue ?? '';
}

export function Perfil() {
  const features = useCompanyFeatures();
  const { user, loading: userLoading, status, error: userError, refreshSession } = useCurrentUser();
  const { stats, loading: statsLoading, error: statsError } = useDashboardStats();
  const { navigateToSection } = useSectionContext();
  const frame = useEquippedFrame(features.achievements);

  const isManagementUser = isManagementRole(user?.role);
  const displayName = profileDisplayName(user, isManagementUser, userLoading);

  return (
    <PageTransition>
      <div className="profile-v app-page">
        <header className="pv-page-head">
          <p className="pv-eyebrow">Conta</p>
          <h1 className="pv-display pv-page-title">Meu perfil</h1>
          <p className="pv-page-lead">Veja sua identidade, progresso e informações de acesso na plataforma.</p>
        </header>

        {!user && userLoading ? (
          <ProfileLoading />
        ) : !user && status === 'unavailable' ? (
          <ProfileError message={userError} onRetry={() => { void refreshSession(); }} />
        ) : (
          // As colunas só agrupam no desktop que cabe na janela (rolam por dentro); fora dele usam display: contents.
          <div className="pv-grid is-columns">
            <div className="pv-col">
              <ProfileIdentity user={user} displayName={displayName} isManagementUser={isManagementUser} frame={frame} />
              <ProfileProgress
                stats={stats}
                statsLoading={statsLoading}
                statsError={Boolean(statsError)}
                fallbackLevel={user?.level}
                showGlobalRanking={features.globalRanking}
                showAchievements={features.achievements}
                onOpenAchievements={() => navigateToSection('conquistas')}
              />
            </div>
            <div className="pv-col">
              <ProfileAccount user={user} userLoading={userLoading} />
              <ProfileSecurity />
              <ProfileNextStep onOpenLearn={() => navigateToSection('conteudos')} />
            </div>
          </div>
        )}
      </div>
    </PageTransition>
  );
}

function ProfileLoading() {
  return (
    <div className="pv-grid" role="status" aria-busy="true">
      <span className="pv-sr">Carregando seu perfil</span>
      <div className="pv-card pv-identity is-loading"><span className="pv-skeleton is-avatar" /><span className="pv-skeleton is-title" /><span className="pv-skeleton" /></div>
      <div className="pv-card pv-account is-loading"><span className="pv-skeleton is-title" /><span className="pv-skeleton" /></div>
      <div className="pv-card pv-security is-loading"><span className="pv-skeleton is-title" /><span className="pv-skeleton" /></div>
    </div>
  );
}

function ProfileError({ message, onRetry }: { message: string | null; onRetry: () => void }) {
  return (
    <section className="pv-card pv-error" aria-labelledby="pv-error-title">
      <h2 id="pv-error-title" className="pv-display pv-card-title">Seu perfil não carregou</h2>
      <p role="alert">{message || 'Não foi possível carregar seu perfil agora.'}</p>
      <AppButton variant="chunky" tone="yellow" size="md" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={onRetry}>
        Tentar novamente
      </AppButton>
    </section>
  );
}
