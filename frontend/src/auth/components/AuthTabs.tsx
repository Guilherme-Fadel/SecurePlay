import { motion } from 'motion/react';

type Mode = 'login' | 'register';

interface AuthTabsProps {
  mode: Mode;
  switchMode: (mode: Mode) => void;
}

export function AuthTabs({ mode, switchMode }: AuthTabsProps) {
  return (
    <div className="flex gap-2 mb-6">
      <button
        onClick={() => switchMode('login')}
        className={`
          flex-1 py-3 border-2 transition-all duration-200 relative
          ${mode === 'login'
            ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-primary)]'
            : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }
        `}
      >
        <span className="tracking-wide">ENTRAR</span>

        {mode === 'login' && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 border-2 border-[var(--secondary)] pointer-events-none"
          />
        )}
      </button>

      <button
        onClick={() => switchMode('register')}
        className={`
          flex-1 py-3 border-2 transition-all duration-200 relative
          ${mode === 'register'
            ? 'bg-[var(--primary)] border-[var(--primary)] text-[var(--text-primary)]'
            : 'bg-transparent border-[var(--border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }
        `}
      >
        <span className="tracking-wide">CRIAR CONTA</span>

        {mode === 'register' && (
          <motion.div
            layoutId="activeTab"
            className="absolute inset-0 border-2 border-[var(--secondary)] pointer-events-none"
          />
        )}
      </button>
    </div>
  );
}