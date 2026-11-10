import { useCallback, useState, useEffect, useRef } from 'react';
import { isAxiosError } from 'axios';
import { ModuloDetalhes, getModulo } from '@/services/conteudo';
import { useAoAtualizarJornada } from '@/hooks/useJornadaAtualizada';

/** denied: 403 do backend (módulo bloqueado); missing: 404; failed: rede/servidor (permite tentar de novo). */
export type ModuleErrorKind = 'denied' | 'missing' | 'failed';

interface ModuleState {
  id: number | null;
  modulo: ModuloDetalhes | null;
  loading: boolean;
  error: string | null;
  errorKind: ModuleErrorKind | null;
}

const FAILED_MESSAGE = 'Não foi possível carregar esta missão.';

function describeFailure(error: unknown): { kind: ModuleErrorKind; message: string } {
  if (!isAxiosError(error)) return { kind: 'failed', message: FAILED_MESSAGE };
  const status = error.response?.status;
  const raw: unknown = error.response?.data?.message;
  const serverMessage = typeof raw === 'string' && raw.trim() ? raw.trim() : null;
  if (status === 403) return { kind: 'denied', message: serverMessage ?? 'Este módulo ainda está bloqueado para você.' };
  if (status === 404) return { kind: 'missing', message: 'Este módulo não está disponível.' };
  return { kind: 'failed', message: FAILED_MESSAGE };
}

export function useModulo(moduloId: number | null) {
  const [state, setState] = useState<ModuleState>({ id: null, modulo: null, loading: false, error: null, errorKind: null });
  const generation = useRef(0);

  const fetch = useCallback(async () => {
    const request = ++generation.current;
    if (!moduloId) {
      setState({ id: moduloId, modulo: null, loading: false, error: null, errorKind: null });
      return;
    }
    setState({ id: moduloId, modulo: null, loading: true, error: null, errorKind: null });
    try {
      const data = await getModulo(moduloId);
      if (data.id !== moduloId) throw new Error('Unexpected module');
      if (request === generation.current) {
        setState({ id: moduloId, modulo: data, loading: false, error: null, errorKind: null });
      }
    } catch (error: unknown) {
      if (request === generation.current) {
        const failure = describeFailure(error);
        setState({ id: moduloId, modulo: null, loading: false, error: failure.message, errorKind: failure.kind });
      }
    }
  }, [moduloId]);

  useEffect(() => {
    void fetch();
    return () => { generation.current += 1; };
  }, [fetch]);

  // Aula aberta pelo professor enquanto o módulo está na tela.
  useAoAtualizarJornada(fetch, Boolean(moduloId));

  // O ID muda no render antes da limpeza do efeito anterior.
  const current = state.id === moduloId;
  return {
    modulo: current ? state.modulo : null,
    loading: current ? state.loading : Boolean(moduloId),
    error: current ? state.error : null,
    errorKind: current ? state.errorKind : null,
    refetch: fetch,
  };
}
