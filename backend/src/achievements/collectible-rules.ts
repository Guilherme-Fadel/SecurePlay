import { BadRequestException } from '@nestjs/common';
import { CosmeticType } from './entities/cosmetic-item.entity';
import { CosmeticRarity } from './entities/cosmetic-rarity';
import { isRetiredType, RETIRED_TYPE_MESSAGE } from './retired-types';
import { parseUnlockRule, UnlockRule } from './unlock-rule';

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Janela de venda vinda do console. Data sem hora vale o dia inteiro em Brasília
 * (UTC-3, sem horário de verão): início 00:00:00.000 e fim 23:59:59.999, porque
 * `isOnSale` é inclusivo ao milissegundo. Data e hora completas ficam como enviadas.
 */
export function parseAvailability(
  value: string | null | undefined,
  edge: 'from' | 'until',
): Date | null {
  if (value === null || value === undefined || value === '') return null;
  const text = DATE_ONLY.test(value)
    ? `${value}T${edge === 'from' ? '00:00:00.000' : '23:59:59.999'}-03:00`
    : value;
  const date = new Date(text);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException(
      edge === 'from' ? 'availableFrom inválido' : 'availableUntil inválido',
    );
  }
  return date;
}

/** Regra de liberação: ausente ou nula significa sem requisitos. */
export function parseOptionalRule(input: unknown): UnlockRule | null {
  return input === null || input === undefined ? null : parseUnlockRule(input);
}

/** Moldura, título e emblema foram descontinuados: o console não cria nem muda itens para eles. */
export function assertActiveType(type: string) {
  if (isRetiredType(type)) throw new BadRequestException(RETIRED_TYPE_MESSAGE);
}

/** Quem já tem o item o equipa pelo tipo: o encaixe de um registro existente é fixo. */
export function assertSlotUnchanged(
  current: string | undefined,
  requested: string,
) {
  if (current !== undefined && current !== requested) {
    throw new BadRequestException(
      'O encaixe não pode ser alterado depois de criado',
    );
  }
}

/** O slug é a chave do ledger de compra: fixo depois de criado. */
export function assertSlugUnchanged(current: string, requested: string) {
  if (current !== requested) {
    throw new BadRequestException(
      'O identificador não pode ser alterado depois de criado.',
    );
  }
}

export const SLOT_LABELS: Record<string, string> = {
  skin: 'Skin',
  head: 'Cabeça',
  face: 'Rosto',
  neck: 'Pescoço',
  effect: 'Efeito',
};

type Schedule = {
  rarity: CosmeticRarity;
  festive_event: string | null;
  available_from: Date | null;
  available_until: Date | null;
};

/** Raridade festiva exige evento e uma janela com fim depois do início. */
export function assertFestiveSchedule(entity: Schedule) {
  if (entity.rarity !== CosmeticRarity.FESTIVE) return;
  if (
    !entity.festive_event ||
    !entity.available_from ||
    !entity.available_until
  ) {
    throw new BadRequestException(
      'Raridade festiva exige evento, início e fim da disponibilidade.',
    );
  }
  if (entity.available_until.getTime() <= entity.available_from.getTime()) {
    throw new BadRequestException(
      'O fim da disponibilidade deve ser depois do início.',
    );
  }
}

type PieceArt = { type: string; art_key: string | null };

/** Todo encaixe do kit precisa de arte confirmada; a mensagem lista os que faltam. */
export function assertKitArt(pieces: PieceArt[]) {
  const missing = pieces
    .filter((piece) => !piece.art_key)
    .map((piece) => SLOT_LABELS[piece.type] ?? piece.type);
  if (missing.length > 0) {
    throw new BadRequestException(`Falta a arte de: ${missing.join(', ')}`);
  }
  if (pieces.length === 0) {
    throw new BadRequestException('O kit precisa de ao menos uma peça.');
  }
}

type ItemVisual = {
  type: CosmeticType;
  art_key: string | null;
  visual_value: string;
};

/** Item avulso precisa de arte ou de um valor visual (fundos, cartões etc.). */
export function assertItemVisual(item: ItemVisual) {
  if (item.art_key || item.visual_value.trim()) return;
  const label = SLOT_LABELS[item.type];
  throw new BadRequestException(
    label
      ? `Falta a arte de: ${label}`
      : 'Falta a arte ou o valor visual do item',
  );
}

const THEME_VALUE = /^[a-z0-9-]{1,64}$/;

/**
 * Fundo e tema do card escolhem um tema da biblioteca pelo `visualValue`, que
 * vira classe CSS no cliente: só letras minúsculas, números e hífens. Vazio vale
 * (o item usa a arte enviada). Os demais encaixes seguem livres.
 */
export function assertThemeValue(type: CosmeticType, visualValue: string) {
  const isTheme =
    type === CosmeticType.BACKGROUND || type === CosmeticType.CARD;
  if (!isTheme || visualValue === '' || THEME_VALUE.test(visualValue)) return;
  throw new BadRequestException(
    'O tema deve usar letras minúsculas, números e hífens (até 64 caracteres).',
  );
}
