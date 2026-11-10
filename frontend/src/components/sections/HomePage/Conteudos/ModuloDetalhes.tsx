import { ContentLoading } from '@/components/shared/ContentLoading';
import { useModulo } from '@/hooks/useModulo';
import { useConteudos } from '@/hooks/useConteudos';
import { useCanonicalLearnPath } from './useCanonicalLearnPath';
import { moduleNumberOf } from './learnMapModel';
import { buildModulePage } from './ModulePageModel';
import { ModuleBackLink, ModulePageHero } from './ModulePageHero';
import { ModulePageChapters } from './ModulePageChapters';
import { ModulePageState } from './ModulePageState';
import '@/styles/module-page.css';

interface ModuloDetalhesProps { moduloId: number; onBack: () => void; onSelectAula: (aulaId: number) => void; }

/** Página do módulo no Aprender: voltar ao mapa, card do módulo e capítulos em abas com as aulas. */
export function ModuloDetalhes({ moduloId, onBack, onSelectAula }: ModuloDetalhesProps) {
  const { modulo, loading, error, errorKind, refetch } = useModulo(moduloId);
  // Lista em cache compartilhada com o mapa: dá o "Módulo N" sem depender de `order`.
  const { modulos } = useConteudos();
  // Antes dos retornos antecipados: a URL ganha o texto do módulo quando ele carrega.
  useCanonicalLearnPath(modulo);

  if (loading) return (
    <div className="module-v">
      <ModuleBackLink onBack={onBack} />
      <ContentLoading variant="module" />
    </div>
  );

  if (error || !modulo) return (
    <div className="module-v">
      <ModuleBackLink onBack={onBack} />
      <ModulePageState
        kind={errorKind === 'denied' || errorKind === 'missing' ? errorKind : 'failed'}
        message={error}
        onBack={onBack}
        onRetry={() => { void refetch(); }}
      />
    </div>
  );

  const page = buildModulePage(modulo);
  return (
    <div className="module-v">
      <ModuleBackLink onBack={onBack} />
      <ModulePageHero modulo={modulo} page={page} number={moduleNumberOf(modulos, modulo.id)} onSelectAula={onSelectAula} />
      {page.total > 0
        ? <ModulePageChapters key={modulo.id} moduloId={modulo.id} page={page} onSelectAula={onSelectAula} />
        : <ModulePageState kind="empty" onBack={onBack} />}
    </div>
  );
}
