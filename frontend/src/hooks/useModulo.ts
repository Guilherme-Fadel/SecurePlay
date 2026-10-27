import { useCallback, useState, useEffect, useRef } from 'react';
import { ModuloDetalhes, getModulo } from '@/services/conteudo';

interface ModuleState {
  id: number | null;
  modulo: ModuloDetalhes | null;
  loading: boolean;
  error: string | null;
}

export function useModulo(moduloId: number | null) {
  const [state, setState] = useState<ModuleState>({ id: null, modulo: null, loading: false, error: null });
  const generation = useRef(0);

  const fetch = useCallback(async () => {
    const request = ++generation.current;
    if (!moduloId) {
      setState({ id: moduloId, modulo: null, loading: false, error: null });
      return;
    }
    setState({ id: moduloId, modulo: null, loading: true, error: null });
    try {
      const data = await getModulo(moduloId);
      if (data.id !== moduloId) throw new Error('Unexpected module');
      if (request === generation.current) {
        setState({ id: moduloId, modulo: data, loading: false, error: null });
      }
    } catch {
      if (request === generation.current) {
        setState({ id: moduloId, modulo: null, loading: false, error: 'Não foi possível carregar esta missão.' });
      }
    }
  }, [moduloId]);

  useEffect(() => {
    void fetch();
    return () => { generation.current += 1; };
  }, [fetch]);

  // O ID muda no render antes da limpeza do efeito anterior.
  const current = state.id === moduloId;
  return {
    modulo: current ? state.modulo : null,
    loading: current ? state.loading : Boolean(moduloId),
    error: current ? state.error : null,
    refetch: fetch,
  };
}
