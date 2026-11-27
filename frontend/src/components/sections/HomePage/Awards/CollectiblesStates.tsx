import { RefreshCw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';

/** Silhuetas do palco e da lista de encaixes, sem dados fictícios nem controles ativos. */
export function CollectiblesLoading() {
  return (
    <div className="cole-v cole-loading" role="status" aria-label="Carregando colecionáveis" aria-busy="true">
      <div className="chr-grid" aria-hidden="true">
        <div className="chr-work">
          <div className="cole-skeleton"><span /><span /><span /></div>
        </div>
        <div className="chr-side">
          <div className="cole-shop">
            <div className="cole-tabs cole-skeleton-tabs"><i /><i /><i /></div>
            <div className="cole-list cole-skeleton-list"><i /><i /><i /></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CollectiblesError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="cole-v">
      <div className="cole-state" role="alert">
        <span className="cole-state-character"><BrandCharacter expression="surprised" /></span>
        <h2 className="cole-display">Não foi possível carregar os colecionáveis</h2>
        <p>Seu saldo e seus itens continuam salvos. Tente novamente para sincronizar.</p>
        <AppButton variant="chunky" tone="yellow" icon={<RefreshCw size={18} aria-hidden="true" />} onClick={onRetry}>
          Tentar novamente
        </AppButton>
      </div>
    </div>
  );
}

export function CollectiblesEmpty() {
  return (
    <div className="cole-v">
      <div className="cole-state">
        <span className="cole-state-character"><BrandCharacter expression="curious" /></span>
        <h2 className="cole-display">Nenhum colecionável no catálogo</h2>
        <p>Quando novos itens forem liberados, eles aparecem aqui para você experimentar.</p>
      </div>
    </div>
  );
}
