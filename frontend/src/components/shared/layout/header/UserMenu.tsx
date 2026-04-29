import { ChevronDown } from 'lucide-react';
import { cn } from '../../../../lib/utils';

interface UserMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function UserMenu({ open, onToggle, onClose }: UserMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="flex items-center gap-3 px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors"
      >
        <img
          src="https://ui-avatars.com/api/?name=Guilherme+Fadel&background=c7d2fe&color=3730a3&bold=true"
          alt="User avatar"
          className="w-9 h-9 rounded-md flex-shrink-0"
        />

        <div className="text-left hidden md:block">
          <p className="text-[var(--text-primary)] text-[var(--font-xs)] leading-tight">
            Guilherme Fadel
          </p>
          <p className="text-[var(--text-secondary)] text-[var(--font-xs)] font-[var(--font-family-inter)] leading-tight">
            Nível 42
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
              <button className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]">
                Meu Perfil
              </button>
              <button className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]">
                Configurações
              </button>
              <div className="border-t border-[var(--border)] my-2" />
              <button className="w-full text-left px-3 py-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--danger)]">
                Sair
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
