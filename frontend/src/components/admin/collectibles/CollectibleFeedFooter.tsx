import { useEffect, useRef } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { CollectibleSkeletons } from './CollectibleCard';

interface FooterProps {
  shown: number;
  total: number;
  page: number;
  hasMore: boolean;
  loadingMore: boolean;
  failed: boolean;
  onLoadMore: () => void;
}

/**
 * Fim da grade: sentinela que pede o próximo lote ao chegar perto (a área que rola é o conteúdo do console),
 * contagem, botão "Carregar mais" (teclado e reserva) e o aviso de erro de um lote seguinte.
 */
export function CollectibleFeedFooter({ shown, total, page, hasMore, loadingMore, failed, onLoadMore }: FooterProps) {
  const sentinel = useRef<HTMLDivElement>(null);
  const request = useRef(onLoadMore);
  request.current = onLoadMore;
  const watching = hasMore && !loadingMore && !failed;
  // Recriar o observador a cada lote faz o sentinela avisar de novo se ainda estiver perto do fim.
  useEffect(() => {
    const node = sentinel.current;
    if (!watching || !node || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver((entries) => { if (entries.some((entry) => entry.isIntersecting)) request.current(); }, { root: node.closest('.admin-console-content'), rootMargin: '0px 0px 400px 0px' });
    observer.observe(node);
    return () => observer.disconnect();
  }, [watching, page]);
  return <div className="collectible-feed-footer">
    {loadingMore && <ul className="collectible-grid" aria-hidden="true"><CollectibleSkeletons count={4} /></ul>}
    {failed && <div className="collectible-feed-error" role="alert"><span>Não foi possível carregar mais.</span><AppButton variant="secondary" onClick={onLoadMore}>Tentar novamente</AppButton></div>}
    <p className="collectible-feed-count" role="status" aria-live="polite">{loadingMore ? 'Carregando mais…' : `Mostrando ${shown} de ${total}`}</p>
    {hasMore && !loadingMore && !failed && <AppButton variant="secondary" onClick={onLoadMore}>Carregar mais</AppButton>}
    <div ref={sentinel} className="collectible-feed-sentinel" aria-hidden="true" />
  </div>;
}
