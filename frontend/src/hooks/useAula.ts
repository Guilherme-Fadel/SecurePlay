import { useCallback, useState, useEffect } from 'react';
import { isAxiosError } from 'axios';
import { AulaDetalhes, getAula } from '@/services/conteudo';

/** denied: 403 (aula bloqueada); missing: 404; failed: rede/servidor (permite tentar de novo). */
export type AulaErrorKind = 'denied' | 'missing' | 'failed';

function describeFailure(error: unknown): { kind: AulaErrorKind; message: string } {
  const status = isAxiosError(error) ? error.response?.status : undefined;
  const raw: unknown = isAxiosError(error) ? error.response?.data?.message : null;
  const serverMessage = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  if (status === 403) return { kind: 'denied', message: serverMessage ?? 'Esta aula ainda está bloqueada para você.' };
  if (status === 404) return { kind: 'missing', message: 'Esta aula não está disponível.' };
  return { kind: 'failed', message: 'Erro ao carregar aula' };
}

export function useAula(aulaId: number) {
  const [aula, setAula] = useState<AulaDetalhes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorKind, setErrorKind] = useState<AulaErrorKind | null>(null);

  const fetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    setErrorKind(null);

    try {
      const data = await getAula(aulaId);
      setAula(data);
    } catch (err: unknown) {
      const failure = describeFailure(err);
      setError(failure.message);
      setErrorKind(failure.kind);
    } finally {
      setLoading(false);
    }
  }, [aulaId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  return { aula, setAula, loading, error, errorKind, refetch: fetch };
}
