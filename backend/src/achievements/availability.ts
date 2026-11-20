/**
 * Janela de venda de um item ou kit. As datas são instantes (UTC no banco),
 * então "até 31/12 23:59:59 de Brasília" é comparado como o instante exato.
 * O início é inclusivo e o fim também.
 */
export function isOnSale(
  item: { available_from: Date | null; available_until: Date | null },
  now: Date = new Date(),
): boolean {
  const instant = now.getTime();
  if (item.available_from && instant < item.available_from.getTime()) {
    return false;
  }
  if (item.available_until && instant > item.available_until.getTime()) {
    return false;
  }
  return true;
}
