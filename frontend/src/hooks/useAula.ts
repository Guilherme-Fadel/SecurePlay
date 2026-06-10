import { useCallback, useState, useEffect } from 'react';
import { AulaDetalhes, getAula } from '@/services/conteudo';

export function useAula(aulaId: number) {
  const [aula, setAula] = useState<AulaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const data = await getAula(aulaId);
      setAula(data);
    } catch {
      setError('Erro ao carregar aula');
    } finally {
      setLoading(false);
    }
  }, [aulaId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { aula, setAula, loading, error, refetch: fetch };
}
