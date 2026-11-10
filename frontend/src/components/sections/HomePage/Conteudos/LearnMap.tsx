import { useMemo } from 'react';
import { JourneyMap, type JourneyMapNode } from '@/components/shared/JourneyMap/JourneyMap';
import { getModuleArtwork } from '@/lib/staticArtwork';
import type { LearnJourney, LearnModule, TerritoryIndex } from './learnMapModel';
import { bloqueioDaTurma, textoDeBloqueio } from './lockCopy';

interface LearnMapProps {
  journey: LearnJourney;
  activeTerritory: TerritoryIndex;
  onOpenModulo: (moduloId: number) => void;
}

function ariaOf(item: LearnModule): string {
  const { title, completedAulas, totalAulas } = item.modulo;
  const lessons = `${completedAulas} de ${totalAulas} aulas`;
  if (item.state === 'done') return `${title}, concluído. Abrir módulo.`;
  if (item.state === 'here') return `${title}, você está aqui, ${lessons}. Abrir módulo.`;
  if (item.state === 'locked') return `${title}, bloqueado. Conclua o módulo anterior para liberar.`;
  const next = item.modulo.nextAula;
  const aviso = next && bloqueioDaTurma(next.lock_reason) ? ` Próxima aula: ${textoDeBloqueio(next.lock_reason, next.opens_at)}.` : '';
  return `${title}, ${lessons}, pode acessar.${aviso} Abrir módulo.`;
}

/**
 * Mapa vertical com todas as paradas; territórios fora do nível escolhido ficam esmaecidos.
 * Altura fixa (learn-map.css) com rolagem própria, começando no ponto atual.
 */
export function LearnMap({ journey, activeTerritory, onOpenModulo }: LearnMapProps) {
  const nodes = useMemo<JourneyMapNode[]>(() => journey.modules.map((item) => ({
    id: item.modulo.id,
    title: item.modulo.title,
    caption: item.state === 'locked' ? 'Bloqueado' : `${item.modulo.completedAulas}/${item.modulo.totalAulas} aulas`,
    art: getModuleArtwork(item.modulo),
    state: item.state,
    stage: item.territory,
    ariaLabel: ariaOf(item),
  })), [journey.modules]);
  const stages = useMemo(() => journey.territories.map((territory) => ({ title: territory.title, locked: territory.locked })), [journey.territories]);

  return (
    <section className="lv-map" aria-label="Mapa dos módulos">
      <JourneyMap
        nodes={nodes}
        stages={stages}
        selectedId={null}
        onSelect={onOpenModulo}
        label="Paradas da trilha. Cada parada é um módulo."
        orientation="vertical"
        interaction="open"
        activeStage={activeTerritory}
        flagLabel="Guardião digital"
        scrollable
      />
    </section>
  );
}
