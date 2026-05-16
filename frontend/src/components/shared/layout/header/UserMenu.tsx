import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { logoutUser } from '@/services/login/logout';
import { useNavigate } from 'react-router-dom';
import { useSectionContext } from '@/contexts/SectionContext';

interface UserMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function UserMenu({ open, onToggle, onClose }: UserMenuProps) {
  const { user, loading } = useCurrentUser();
  const { stats } = useDashboardStats();
  const navigate = useNavigate();
  const { setActiveSection } = useSectionContext();
  
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors"
      >
        <img
          src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name ?? '')}&background=c7d2fe&color=3730a3&bold=true`}
          alt="User avatar"
          className="w-9 h-9 rounded-md flex-shrink-0"
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
              <button 
              onClick={() => { logoutUser(); navigate('/login'); }}
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
