import { CosmeticType } from './entities/cosmetic-item.entity';

/**
 * Tipos descontinuados pelo produto (a seção "Molduras, títulos e emblemas"
 * saiu de Colecionáveis). Os valores seguem no enum e no banco, e as linhas
 * antigas continuam lá; só deixam de aparecer para o aluno e de ser criadas,
 * compradas ou equipadas.
 */
export const RETIRED_TYPES: readonly CosmeticType[] = [
  CosmeticType.FRAME,
  CosmeticType.TITLE,
  CosmeticType.BADGE,
];

export function isRetiredType(type: string | null | undefined): boolean {
  return (RETIRED_TYPES as readonly string[]).includes(type ?? '');
}

/** Tipos que o produto ainda aceita: os encaixes do personagem. */
export const ACTIVE_TYPES: readonly CosmeticType[] = Object.values(
  CosmeticType,
).filter((type) => !isRetiredType(type));

export const RETIRED_TYPE_MESSAGE =
  'Este tipo de colecionável foi descontinuado (moldura, título e emblema).';
