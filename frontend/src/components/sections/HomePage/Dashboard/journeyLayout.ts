import type { JourneyNodeData } from '@/services/dashboard';

export interface JourneySlot {
  x: number;
  y: number;
}

const SLOT_PRESETS: Record<number, JourneySlot[]> = {
  1: [{ x: 50, y: 52 }],
  2: [
    { x: 28, y: 61 },
    { x: 72, y: 43 },
  ],
  3: [
    { x: 18, y: 64 },
    { x: 50, y: 44 },
    { x: 82, y: 60 },
  ],
  4: [
    { x: 10, y: 64 },
    { x: 37, y: 45 },
    { x: 65, y: 61 },
    { x: 90, y: 42 },
  ],
  5: [
    { x: 8, y: 64 },
    { x: 29, y: 46 },
    { x: 50, y: 60 },
    { x: 71, y: 43 },
    { x: 92, y: 58 },
  ],
  6: [
    { x: 7, y: 64 },
    { x: 24, y: 47 },
    { x: 41, y: 61 },
    { x: 59, y: 43 },
    { x: 76, y: 58 },
    { x: 93, y: 41 },
  ],
};

export function visibleNodeCount(width: number): number {
  if (width >= 1180) return 6;
  if (width >= 900) return 5;
  if (width >= 640) return 4;
  return 3;
}

export function getJourneySlots(count: number): JourneySlot[] {
  return SLOT_PRESETS[Math.max(1, Math.min(6, count))] ?? SLOT_PRESETS[3];
}

export function getJourneyWindow<T extends Pick<JourneyNodeData, 'id'>>(
  nodes: T[],
  currentId: number | null,
  requestedCount: number,
): T[] {
  const count = Math.min(nodes.length, Math.max(1, requestedCount));
  if (nodes.length <= count) return nodes;
  const currentIndex = Math.max(
    0,
    nodes.findIndex((node) => node.id === currentId),
  );
  const preferredStart = currentIndex - Math.floor((count - 1) / 2);
  const start = Math.max(0, Math.min(nodes.length - count, preferredStart));
  return nodes.slice(start, start + count);
}

export function buildJourneyPath(slots: JourneySlot[]): string {
  if (slots.length === 0) return '';
  if (slots.length === 1) return `M ${slots[0].x} ${slots[0].y}`;
  return slots.slice(1).reduce((path, point, index) => {
    const previous = slots[index];
    const distance = point.x - previous.x;
    const firstControlX = previous.x + distance * 0.42;
    const secondControlX = point.x - distance * 0.42;
    return `${path} C ${firstControlX} ${previous.y} ${secondControlX} ${point.y} ${point.x} ${point.y}`;
  }, `M ${slots[0].x} ${slots[0].y}`);
}
