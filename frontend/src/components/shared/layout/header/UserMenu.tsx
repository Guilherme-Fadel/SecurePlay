import { LogOut, Moon, ShieldIcon, Sun, UserRound } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { logoutUser } from '@/services/login/logout';
import { useNavigate } from 'react-router-dom';
import { useSectionContext } from '@/contexts/SectionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAchievementShop } from '@/hooks/useAchievements';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import type { CurrentUser } from '@/services/me';
import { RailPopover } from './RailPopover';
import '@/styles/cosmetics.css';

export const ACCOUNT_PANEL_ID = 'sp-rail-account';

interface UserMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** Mesmo critério que a Sidebar usava para o item Administrador. */
  showAdmin: boolean;
  /** A seção Perfil está aberta: o gatilho da conta fica aceso. */
  profileActive: boolean;
}

function useEquippedCosmetics() {
  const features = useCompanyFeatures();
  const { data: cosmeticShop } = useAchievementShop(features.achievements);
  return {
    frame: cosmeticShop?.equipped.find((item) => item.type === 'frame')?.visualValue ?? '',
    background: cosmeticShop?.equipped.find((item) => item.type === 'background')?.visualValue ?? '',
  };
}

export function UserMenu({ open, onToggle, onClose, showAdmin, profileActive }: UserMenuProps) {
  const { user } = useCurrentUser();
  const cosmetics = useEquippedCosmetics();

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={cn('sp-rail-account-button sp-rail-account-avatar', profileActive && 'is-active')}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? ACCOUNT_PANEL_ID : undefined}
        aria-label="Abrir menu da conta"
        title="Conta"
      >
        <UserAvatar user={user} className={cn('sp-rail-avatar cosmetic-avatar', cosmetics.frame)} />
      </button>

      {open && (
        <RailPopover id={ACCOUNT_PANEL_ID} label="Conta" className="sp-account-menu" onClose={onClose}>
          <AccountSummary frame={cosmetics.frame} background={cosmetics.background} />
          <AccountActions showAdmin={showAdmin} onClose={onClose} />
        </RailPopover>
      )}
    </>
  );
}

function AccountSummary({ frame, background }: { frame: string; background: string }) {
  const { user, loading } = useCurrentUser();

  return (
    <div className={cn('sp-account-summary cosmetic-background-host', background)}>
      <UserAvatar user={user} className={cn('sp-account-summary-avatar cosmetic-avatar', frame)} />
      <div className="sp-account-summary-copy">
        <strong>{loading ? '...' : user?.nickname ?? user?.name}</strong>
        <AccountLevel user={user} loading={loading} />
        {user && <AccountSchool user={user} />}
      </div>
    </div>
  );
}

function UserAvatar({ user, className }: { user: CurrentUser | null; className: string }) {
  return <Avatar name={user?.name} nickname={user?.nickname} imageUrl={user?.profile_image_url} className={className} />;
}

function AccountLevel({ user, loading }: { user: CurrentUser | null; loading: boolean }) {
  const { stats } = useDashboardStats();
  return <small>Nível {stats?.level ?? (loading ? '...' : user?.level)}</small>;
}

/** Escola (empresa) do aluno, discreta no painel; no celular estreito é o único lugar do logo. */
function AccountSchool({ user }: { user: CurrentUser }) {
  const [failedLogo, setFailedLogo] = useState<string | null>(null);
  const logo = user.empresa_logo;
  if (!user.empresa_nome) return null;
  return (
    <span className="sp-account-school">
      {logo && logo !== failedLogo && <img src={logo} alt="" onError={() => setFailedLogo(logo)} />}
      {user.empresa_nome}
    </span>
  );
}

function AccountActions({ showAdmin, onClose }: { showAdmin: boolean; onClose: () => void }) {
  const { clearSession } = useCurrentUser();
  const navigate = useNavigate();
  const { setActiveSection } = useSectionContext();

  const open = (section: 'perfil' | 'admin') => {
    setActiveSection(section);
    onClose();
  };

  const handleLogout = async () => {
    onClose();
    try {
      await logoutUser();
    } finally {
      clearSession();
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="sp-account-actions">
      {showAdmin && (
        <button type="button" className="sp-account-item" onClick={() => open('admin')}>
          <ShieldIcon size={17} aria-hidden="true" />
          Administrador
        </button>
      )}
      <button type="button" className="sp-account-item" onClick={() => open('perfil')}>
        <UserRound size={17} aria-hidden="true" />
        Meu perfil
      </button>
      <ThemeSwitchRow />
      <button type="button" className="sp-account-item is-danger" onClick={handleLogout}>
        <LogOut size={17} aria-hidden="true" />
        Sair
      </button>
    </div>
  );
}

function ThemeSwitchRow() {
  const { theme, toggleTheme } = useTheme();
  const isLight = theme === 'light';

  return (
    <div className="sp-account-theme">
      <span id="sp-account-theme-label">Tema claro</span>
      <button
        type="button"
        role="switch"
        aria-checked={isLight}
        aria-labelledby="sp-account-theme-label"
        title={isLight ? 'Ativar tema escuro' : 'Ativar tema claro'}
        onClick={toggleTheme}
        className={cn('sp-account-switch', isLight ? 'is-light' : 'is-dark')}
      >
        <span className="sp-account-switch-thumb" aria-hidden="true">
          {isLight ? <Sun size={12} /> : <Moon size={12} />}
        </span>
      </button>
    </div>
  );
}
