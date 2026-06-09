import { useCallback, useState, useEffect } from 'react';
import { ModuloDetalhes, getModulo } from '@/services/conteudo';

export function useModulo(moduloId: number | null) {
  const [modulo, setModulo] = useState<ModuloDetalhes | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    if (!moduloId) return;

    setLoading(true);
    setError(null);

    try {
      const data = await getModulo(moduloId);
      setModulo(data);
    } catch {
      setError('Erro ao carregar módulo');
    } finally {
      setLoading(false);
    }
  }, [moduloId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { modulo, loading, error, refetch: fetch };
}
