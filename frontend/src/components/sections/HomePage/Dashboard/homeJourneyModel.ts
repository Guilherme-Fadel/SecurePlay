import type { PebbleState } from '@/components/ui/visuals/Pebble';
import type { JourneyData, JourneyNodeData } from '@/services/dashboard';

export interface HomeJourneyNode extends JourneyNodeData {
  /** Posição do território na jornada (0 = primeiro). */
  stageIndex: number;
  stageTitle: string;
  state: PebbleState;
  /** Módulo anterior na ordem da jornada (para explicar o bloqueio). */
  previousTitle: string | null;
}

export interface HomeJourney {
  nodes: HomeJourneyNode[];
  stages: Array<{ title: string; locked: boolean }>;
  current: HomeJourneyNode | null;
  completedModules: number;
}

/** Concluído, atual, disponível ou bloqueado; o backend é a autoridade. */
function nodeState(node: JourneyNodeData, currentId: number | null): PebbleState {
  if (node.availability === 'locked') return 'locked';
  if (node.totalAulas > 0 && node.completedAulas >= node.totalAulas) return 'done';
  if (node.progress >= 100) return 'done';
  return node.id === currentId ? 'here' : 'next';
}

export function buildHomeJourney(journey: JourneyData | null): HomeJourney {
  const stages = [...(journey?.stages ?? [])].sort((a, b) => a.order - b.order);
  const currentId = journey?.currentModuleId ?? null;
  const nodes: HomeJourneyNode[] = [];
  stages.forEach((stage, stageIndex) => {
    stage.nodes.forEach((node) => {
      nodes.push({
        ...node,
        stageIndex,
        stageTitle: stage.title,
        state: nodeState(node, currentId),
        previousTitle: nodes[nodes.length - 1]?.title ?? null,
      });
    });
  });
  const current = nodes.find((node) => node.id === currentId)
    ?? nodes.find((node) => node.state === 'next')
    ?? null;
  return {
    nodes,
    stages: stages.map((stage, index) => ({
      title: stage.title,
      locked: nodes.filter((node) => node.stageIndex === index).every((node) => node.state === 'locked'),
    })),
    current,
    completedModules: nodes.filter((node) => node.state === 'done').length,
  };
}

/** Número da próxima aula do módulo (1-based), limitado ao total. */
export function nextLessonNumber(node: Pick<JourneyNodeData, 'completedAulas' | 'totalAulas'>): number {
  return Math.min(node.completedAulas + 1, Math.max(node.totalAulas, 1));
}

export const formatNumber = (value: number) => value.toLocaleString('pt-BR');
