import { ChevronDown, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { logoutUser } from '@/services/login/logout';
import { useNavigate } from 'react-router-dom';
import { useSectionContext } from '@/contexts/SectionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAchievementShop } from '@/hooks/useAchievements';
import { Avatar } from '@/components/ui/visuals/Avatar';

interface UserMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function UserMenu({ open, onToggle, onClose }: UserMenuProps) {
  const { user, loading, clearSession } = useCurrentUser();
  const { stats } = useDashboardStats();
  const navigate = useNavigate();
  const { setActiveSection } = useSectionContext();
  const { theme, toggleTheme } = useTheme();
  const { data: cosmeticShop } = useAchievementShop();
  const equippedFrame = cosmeticShop?.equipped.find((item) => item.type === 'frame')?.visualValue ?? '';
  const equippedBackground = cosmeticShop?.equipped.find((item) => item.type === 'background')?.visualValue ?? '';

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
    <div className="relative">
      <button
        onClick={onToggle}
        className={cn('secure-user-menu-trigger cosmetic-background-host flex items-center gap-3 px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors', equippedBackground)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Abrir opções do perfil"
      >
        <Avatar
          name={user?.name}
          nickname={user?.nickname}
          imageUrl={user?.profile_image_url}
          className={cn('secure-user-avatar cosmetic-avatar w-9 h-9 rounded-md flex-shrink-0', equippedFrame)}
        />

        <div className="text-left hidden md:block">
          <p className="text-[var(--text-primary)] text-[var(--font-xs)] leading-tight">
            {loading ? '...' : user?.nickname ?? user?.name}
          </p>
          <p className="text-[var(--text-secondary)] text-[var(--font-xs)] font-[var(--font-family-inter)] leading-tight">
            Nivel {stats?.level ?? (loading ? '...' : user?.level)}
          </p>
        </div>

        <ChevronDown
          size={16}
          className={cn(
            'text-[var(--text-secondary)] transition-transform duration-200',
            open && 'rotate-180'
          )}
        />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <div className="secure-user-dropdown absolute right-0 top-14 z-50" role="menu" aria-label="Opções da conta">
            <div className="secure-user-dropdown-content">
              <button
                type="button"
                role="menuitem"
                onClick={() => { setActiveSection('perfil'); onClose(); }}
                className="secure-user-dropdown-item"
              >
                Meu Perfil
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => { setActiveSection('configuracoes'); onClose(); }}
                className="secure-user-dropdown-item"
              >
                Configurações
              </button>

              <div className="secure-user-dropdown-divider" />

              <div className="secure-user-dropdown-theme">
                <span>Tema</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'light'}
                  aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                  onClick={toggleTheme}
                  className={cn(
                    'secure-user-theme-switch',
                    theme === 'light'
                      ? 'is-light'
                      : 'is-dark'
                  )}
                >
                  <span
                    className={cn(
                      'secure-user-theme-switch-thumb',
                      theme === 'light' ? 'is-light' : 'is-dark'
                    )}
                  >
                    {theme === 'light' ? (
                      <Sun size={12} className="text-[var(--accent-text)]" />
                    ) : (
                      <Moon size={12} className="text-[var(--text-secondary)]" />
                    )}
                  </span>
                </button>
              </div>

              <div className="secure-user-dropdown-divider" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="secure-user-dropdown-item is-danger"
              >
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
