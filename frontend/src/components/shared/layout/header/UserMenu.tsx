import { ChevronDown, Moon, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { logoutUser } from '@/services/login/logout';
import { useNavigate } from 'react-router-dom';
import { useSectionContext } from '@/contexts/SectionContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useAchievementShop } from '@/hooks/useAchievements';

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
      >
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? '')}&background=c7d2fe&color=3730a3&bold=true`}
          alt="User avatar"
          className={cn('cosmetic-avatar w-9 h-9 rounded-md flex-shrink-0', equippedFrame)}
        />

        <div className="text-left hidden md:block">
          <p className="text-[var(--text-primary)] text-[var(--font-xs)] leading-tight">
            {loading ? '...' : user?.name}
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

          <div className="absolute right-0 top-14 w-48 bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg shadow-xl z-50">
            <div className="p-2">
              <button
              onClick={() => { setActiveSection('perfil'); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]">
                Meu Perfil
              </button>
              <button
              onClick={() => { setActiveSection('configuracoes'); onClose(); }}
              className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]">
                Configurações
              </button>

              <div className="border-t border-[var(--border)] my-2" />

              <div className="px-3 py-2 flex items-center justify-between gap-2">
                <span className="text-[var(--text-secondary)] text-[var(--font-xs)]">
                  Tema
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={theme === 'light'}
                  aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
                  onClick={toggleTheme}
                  className={cn(
                    'relative inline-flex h-7 w-14 items-center rounded-full border-2 transition-colors',
                    theme === 'light'
                      ? 'bg-[var(--accent-30)] border-[var(--accent-dark)]'
                      : 'bg-[var(--background)] border-[var(--border)]'
                  )}
                >
                  <span
                    className={cn(
                      'inline-flex h-5 w-5 items-center justify-center rounded-full bg-[var(--surface)] shadow transition-transform',
                      theme === 'light' ? 'translate-x-7' : 'translate-x-1'
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

              <div className="border-t border-[var(--border)] my-2" />
              <button
              onClick={handleLogout}
              className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--danger)]">
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
