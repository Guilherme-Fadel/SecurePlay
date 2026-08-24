import { Shield } from 'lucide-react';

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-12 h-12 bg-[var(--primary)] border border-[var(--border)] rounded-md relative flex items-center justify-center">
        <Shield className="w-6 h-6 text-[var(--text-primary)]" />
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-[var(--secondary)] border border-[var(--border)] rounded-sm"></div>
      </div>

      <span className="text-[var(--text-primary)]">
        SECURE PLAY
      </span>
    </div>
  );
}