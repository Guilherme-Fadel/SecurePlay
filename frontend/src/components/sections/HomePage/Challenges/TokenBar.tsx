import { Coins } from 'lucide-react';
import type { TokenState } from '@/services/arcade';
interface TokenBarProps {
    tokens: TokenState | null;
    secondsLeft: number;
}
function formatCountdown(totalSeconds: number): string {
    const m = Math.floor(totalSeconds / 60);
    const s = totalSeconds % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
}
export function TokenBar({ tokens, secondsLeft }: TokenBarProps) {
    if (!tokens)
        return null;
    const full = tokens.balance >= tokens.cap;
    return (<div className="app-token-bar flex items-center gap-3">
      <div className="flex items-center gap-1" aria-label={`${tokens.balance} de ${tokens.cap} fichas`}>
        {Array.from({ length: tokens.cap }).map((_, i) => {
            const active = i < tokens.balance;
            return (<Coins key={i} size={18} className={active
                    ? 'text-[var(--accent-text)]'
                    : 'text-[var(--border-light)]'}/>);
        })}
      </div>

      <span className="text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">
        {tokens.balance}/{tokens.cap} fichas
        {!full && ` · +1 em ${formatCountdown(secondsLeft)}`}
      </span>
    </div>);
}
