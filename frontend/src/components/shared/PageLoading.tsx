import { usePageLoading } from '@/contexts/PageLoadingContext';

/** Mesmo loading visual para sessão e chunks de todas as rotas. */
export function PageLoading() {
  usePageLoading(true);
  return null;
}
