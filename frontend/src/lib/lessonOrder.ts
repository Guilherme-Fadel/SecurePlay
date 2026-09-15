import type { AulaResumo } from '@/services/conteudo';

export interface AulaSection {
  name: string;
  aulas: AulaResumo[];
}

export function groupAulasBySections(
  aulas: readonly AulaResumo[],
): AulaSection[] {
  const sections = new Map<string, AulaResumo[]>();

  for (const aula of aulas) {
    const name = aula.section_name?.trim() ?? '';
    const grouped = sections.get(name) ?? [];
    if (!sections.has(name)) sections.set(name, grouped);
    grouped.push(aula);
  }

  return Array.from(sections, ([name, groupedAulas]) => ({
    name,
    aulas: [...groupedAulas].sort((a, b) => a.order - b.order || a.id - b.id),
  }));
}

export function sortAulasByModuleSequence(
  aulas: readonly AulaResumo[],
): AulaResumo[] {
  const globalOrder = [...aulas].sort(
    (a, b) => a.order - b.order || a.id - b.id,
  );
  const uniqueOrders = new Set(aulas.map((aula) => aula.order));

  if (uniqueOrders.size === aulas.length) return globalOrder;

  return groupAulasBySections(aulas).flatMap((section) => section.aulas);
}
