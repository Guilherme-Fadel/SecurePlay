import type { ReactNode } from 'react';
import { RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter, type BrandCharacterExpression } from '@/components/shared/BrandCharacter';

/** Silhuetas do álbum durante a espera: sem dados fictícios nem controles ativos. */
export function AlbumLoading() {
  return (
    <div className="al-loading" role="status" aria-label="Carregando álbum" aria-busy="true">
      <div className="al-loading-band" aria-hidden="true" />
      <div className="al-loading-grid" aria-hidden="true">
        {[0, 1, 2].map((index) => <div key={index} className="al-loading-card" />)}
      </div>
    </div>
  );
}

/** Estados explícitos com o personagem na pose do canvas (erro surpreso, vazio curioso, completo feliz). */
export function AlbumState({ title, children, expression, kind = 'status', onRetry }: {
  title: string;
  children: ReactNode;
  expression: BrandCharacterExpression;
  kind?: 'status' | 'alert';
  onRetry?: () => void;
}) {
  return (
    <section className="al-state" role={kind} aria-labelledby="al-state-title">
      <span className="al-state-pet" aria-hidden="true"><BrandCharacter expression={expression} /></span>
      <div className="al-state-copy">
        <h2 id="al-state-title" className="al-state-title">{title}</h2>
        <p>{children}</p>
        {onRetry && (
          <AppButton variant="chunky" tone="ghost" size="sm" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={onRetry}>
            Tentar novamente
          </AppButton>
        )}
      </div>
    </section>
  );
}
