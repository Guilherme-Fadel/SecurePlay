import { Modulo, getModulos } from '@/services/conteudo';
import { useCachedQuery } from './useCachedQuery';

/** Módulos do aluno com progresso, bloqueio e próxima aula (o backend é a autoridade). */
export function useConteudos() {
  const { data: modulos, loading, error, refetch } = useCachedQuery<Modulo[]>(
    'conteudoModulos',
    getModulos,
    { staleTime: 45 * 60 * 1000, refetchInterval: 120_000 },
  );

  return { modulos, loading, error, refetch };
}
