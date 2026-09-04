import { useState, useMemo } from 'react';
import { Modulo, getModulos } from '@/services/conteudo';
import { useCachedQuery } from './useCachedQuery';

type FilterType = 'todos' | 'video' | 'quadrinho';
type FilterStatus = 'todos' | 'em_progresso' | 'concluidos';

export function useConteudos() {
  const { data: modulos, loading, error, refetch } = useCachedQuery<Modulo[]>(
    'conteudoModulos',
    getModulos,
    { staleTime: 50 * 60 * 1000 },
  );

  const [filterType, setFilterType] = useState<FilterType>('todos');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('todos');

  const filtered = useMemo(() => {
    if (!modulos) return [];

    return modulos.filter((modulo) => {
      if (filterType !== 'todos') {
        if (filterType === 'video' && modulo.type !== 'video' && modulo.type !== 'misto') return false;
        if (filterType === 'quadrinho' && modulo.type !== 'quadrinho' && modulo.type !== 'misto') return false;
      }

      if (filterStatus === 'em_progresso' && (modulo.progress === 0 || modulo.progress === 100)) return false;
      if (filterStatus === 'concluidos' && modulo.progress !== 100) return false;

      return true;
    });
  }, [modulos, filterType, filterStatus]);

  return {
    modulos: filtered,
    allModulos: modulos,
    loading,
    error,
    refetch,
    filterType,
    setFilterType,
    filterStatus,
    setFilterStatus,
  };
}
