import type { CosmeticType, LegacyCosmeticType } from '@/services/achievements';
import type { CollectibleItemType } from '@/services/adminCollectibles';

/** Encaixes descontinuados (moldura, título, emblema): o console só os exibe como "Legado"; o backend recusa criar ou salvar. */
export const LEGACY_TYPES: readonly LegacyCosmeticType[] = ['frame', 'title', 'badge'];

export const LEGACY_MESSAGE = 'Moldura, título e emblema foram descontinuados: este item fica só para consulta e não pode ser salvo.';

export const isLegacyType = (type: CollectibleItemType): boolean => LEGACY_TYPES.some((candidate) => candidate === type);

/** O encaixe do item como tipo salvável; um encaixe descontinuado nunca vira corpo de requisição. */
export function savableType(type: CollectibleItemType, allowed: readonly CosmeticType[]): CosmeticType {
  const found = allowed.find((candidate) => candidate === type);
  if (!found) throw new Error('O encaixe deste item foi descontinuado e não pode ser salvo.');
  return found;
}
