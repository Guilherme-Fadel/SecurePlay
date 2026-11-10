import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { parseStudentPath, paths, type LearnRef, type StudentLocation } from '@/lib/appPaths';

export type CanonicalLesson = LearnRef & { moduloId: number };

interface LearnIds { moduloId: number | null; moduloTitle: string | null; aulaId: number | null; aulaTitle: string | null; aulaModuloId: number | null }

/** Caminho canonico deste conteudo, ou `null` quando a URL atual nao e dele ou ainda nao da para decidir. */
function canonicalTarget(current: StudentLocation, ids: LearnIds): string | null {
  const { moduloId, moduloTitle, aulaId, aulaTitle, aulaModuloId } = ids;
  if (aulaId === null || aulaModuloId === null) {
    if (moduloId === null || current.moduloId !== moduloId || current.aulaRaw !== null) return null;
    return paths.aprenderModulo({ id: moduloId, title: moduloTitle });
  }
  if (current.aulaId !== aulaId) return null;
  const sameModulo = moduloId === aulaModuloId;
  // Modulo da URL ainda carregando: espera, para nao apagar o texto que ja esta la.
  if (!sameModulo && moduloId === null && current.moduloId === aulaModuloId) return null;
  return paths.aprenderAula({ id: aulaModuloId, title: sameModulo ? moduloTitle : null }, { id: aulaId, title: aulaTitle });
}

/**
 * Deixa a URL de modulo/aula no formato canonico (`/aprender/8-titulo/47-titulo`)
 * depois que o dado carregou: acrescenta ou atualiza o texto e corrige o numero do
 * modulo pelo `modulo_id` da aula. So age sobre a URL que corresponde a este
 * conteudo (mesmos IDs) e usa `replace`, entao nao cria passo no historico. Sem
 * dado carregado (erro, 403, 404) a URL fica como foi digitada. Nao faz chamada a API.
 */
export function useCanonicalLearnPath(modulo: LearnRef | null, aula?: CanonicalLesson | null) {
  const { pathname, search, hash, state } = useLocation();
  const navigate = useNavigate();
  const moduloId = modulo?.id ?? null;
  const moduloTitle = modulo?.title ?? null;
  const aulaId = aula?.id ?? null;
  const aulaTitle = aula?.title ?? null;
  const aulaModuloId = aula?.moduloId ?? null;

  useEffect(() => {
    const current = parseStudentPath(pathname);
    if (current?.section !== 'conteudos') return;
    const target = canonicalTarget(current, { moduloId, moduloTitle, aulaId, aulaTitle, aulaModuloId });
    if (!target) return;
    const canonical = parseStudentPath(target);
    if (canonical?.moduloRaw === current.moduloRaw && canonical?.aulaRaw === current.aulaRaw) return;
    navigate({ pathname: target, search, hash }, { replace: true, state });
  }, [pathname, search, hash, state, navigate, moduloId, moduloTitle, aulaId, aulaTitle, aulaModuloId]);
}
