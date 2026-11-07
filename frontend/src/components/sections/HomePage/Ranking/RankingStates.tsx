import { RotateCcw } from 'lucide-react';
import type { ReactNode } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';

interface RankingStateProps {
  title: string;
  children: ReactNode;
  kind?: 'status' | 'alert';
  onRetry?: () => void;
}

/** Estados explícitos (erro, vazio, histórico indisponível) no lugar do pódio e da lista. */
export function RankingState({ title, children, kind = 'status', onRetry }: RankingStateProps) {
  return (
    <section className="rk-card rk-state" role={kind} aria-labelledby="rk-state-title">
      <span className="rk-state-pet" aria-hidden="true">
        <BrandCharacter expression={kind === 'alert' ? 'surprised' : 'curious'} />
      </span>
      <div className="rk-state-copy">
        <h2 id="rk-state-title" className="rk-card-title">{title}</h2>
        <p className="rk-muted">{children}</p>
        {onRetry && <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>}
      </div>
    </section>
  );
}
