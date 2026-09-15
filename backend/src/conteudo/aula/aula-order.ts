import { Aula } from './aula.entity';

/**
 * Produz a ordem pedagogica do modulo: todas as aulas de um capitulo antes de
 * avancar para o seguinte. O menor id do capitulo preserva a ordem historica
 * de criacao quando dados antigos reiniciam `order` em cada secao.
 */
export function sortAulasByModuleSequence<
  T extends Pick<Aula, 'id' | 'order' | 'section_name'>,
>(aulas: readonly T[]): T[] {
  const globalOrder = [...aulas].sort(
    (a, b) => a.order - b.order || a.id - b.id,
  );
  const uniqueOrders = new Set(aulas.map((aula) => aula.order));

  if (uniqueOrders.size === aulas.length) {
    return globalOrder;
  }

  const sectionFirstId = new Map<string, number>();

  for (const aula of aulas) {
    const section = aula.section_name?.trim() ?? '';
    const currentFirstId = sectionFirstId.get(section);
    if (currentFirstId === undefined || aula.id < currentFirstId) {
      sectionFirstId.set(section, aula.id);
    }
  }

  return [...aulas].sort((a, b) => {
    const aSection = a.section_name?.trim() ?? '';
    const bSection = b.section_name?.trim() ?? '';
    return (
      (sectionFirstId.get(aSection) ?? a.id) -
        (sectionFirstId.get(bSection) ?? b.id) ||
      a.order - b.order ||
      a.id - b.id
    );
  });
}
