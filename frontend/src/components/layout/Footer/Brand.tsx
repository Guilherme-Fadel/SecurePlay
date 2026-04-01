import { Shield } from 'lucide-react';

export function Brand() {
  return (
    <div className="md:col-span-2">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 bg-[var(--primary)] border-4 border-[var(--border-primary)] relative flex items-center justify-center">
          <Shield className="w-6 h-6 text-[var(--text-primary)]" />
          <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--secondary)] border-2 border-[var(--border-primary)]"></div>
        </div>

        <span className="text-[var(--text-primary)] font-['Press_Start_2P'] text-sm">
          SECUREPLAY
        </span>
      </div>

      <p className="text-[var(--text-primary)] text-sm leading-relaxed mb-6 max-w-md">
        Transformando segurança da informação em uma jornada educativa e gamificada.
      </p>

      <div className="flex gap-4">
        {['📱', '💼', '🎮'].map((emoji) => (
          <button
            key={emoji}
            className="cursor-none w-10 h-10 bg-[var(--surface-alt)] border-2 border-[var(--border-primary)] hover:border-[var(--secondary)] hover:bg-[var(--primary)] transition-all flex items-center justify-center text-lg"
          >
            {emoji}
          </button>
        ))}
      </div>
    </div>
  );
}