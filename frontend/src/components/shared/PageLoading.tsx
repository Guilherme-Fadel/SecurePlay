import { LoadingScreen } from './LoadingScreen';

/** Mesmo loading visual para sessão e chunks de todas as rotas. */
export function PageLoading({ label = 'Carregando página...' }: { label?: string }) {
  return <LoadingScreen label={label} context="page" />;
}
