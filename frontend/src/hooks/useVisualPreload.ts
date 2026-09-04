import { useEffect } from 'react';
import { fetchCached } from '@/lib/queryCache';
import { getModulos } from '@/services/conteudo';

export function useVisualPreload() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      // Aquece somente os dados. Imagens editoriais/S3 são carregadas sob demanda
      // para não disputar o carregamento inicial do dashboard.
      void fetchCached('conteudoModulos', getModulos);
    }, 1500);
    return () => window.clearTimeout(timer);
  }, []);
}
