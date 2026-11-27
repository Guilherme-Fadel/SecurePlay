import { CosmeticItem } from './entities/cosmetic-item.entity';
import { CosmeticKit } from './entities/cosmetic-kit.entity';
import { ART_MIME_BY_EXT, artExtensionOf } from './collectible-art';
import {
  assertActiveType,
  assertSlotUnchanged,
  assertThemeValue,
  parseAvailability,
  parseOptionalRule,
} from './collectible-rules';
import type {
  CollectibleAdjustDto,
  CollectibleItemDto,
  CollectibleScheduleDto,
} from './dto/collectible-item.dto';
import type { CollectibleKitDto } from './dto/collectible-kit.dto';

/** Confere se a arte existe no bucket e tem o formato do encaixe (faixa no tema do card). */
export type ArtAsserter = (artKey: string, type: string) => Promise<void>;

/** Evento, janela de venda e regra de liberação (itens e kits). */
export function applySchedule(
  target: CosmeticItem | CosmeticKit,
  dto: CollectibleScheduleDto,
) {
  target.festive_event = dto.festiveEvent || null;
  target.available_from = parseAvailability(dto.availableFrom, 'from');
  target.available_until = parseAvailability(dto.availableUntil, 'until');
  target.unlock_rule = parseOptionalRule(dto.unlockRule);
}

export function applyKitFields(kit: CosmeticKit, dto: CollectibleKitDto) {
  kit.slug = dto.slug;
  kit.name = dto.name;
  kit.description = dto.description;
  kit.rarity = dto.rarity;
  kit.price = dto.price;
  applySchedule(kit, dto);
}

/** Camada, recolorir e ajuste fino; campo ausente mantém o valor atual (ou o padrão). */
export function applyAppearance(
  item: CosmeticItem,
  dto: {
    layer?: 'back' | 'front';
    recolorable?: boolean;
    adjust?: CollectibleAdjustDto;
  },
) {
  item.layer = dto.layer ?? item.layer ?? 'front';
  item.recolorable = dto.recolorable ?? item.recolorable ?? false;
  applyAdjust(item, dto.adjust);
}

function applyAdjust(item: CosmeticItem, adjust?: CollectibleAdjustDto) {
  item.adjust_x = adjust?.x ?? item.adjust_x ?? 0;
  item.adjust_y = adjust?.y ?? item.adjust_y ?? 0;
  item.adjust_scale = adjust?.scale ?? item.adjust_scale ?? 1;
}

/** `undefined` mantém a arte; `null` remove; chave nova é conferida no bucket. */
export async function applyArt(
  item: CosmeticItem,
  artKey: string | null | undefined,
  assertArt: ArtAsserter,
) {
  if (artKey === undefined) {
    item.art_key ??= null;
    item.art_mime ??= null;
    return;
  }
  if (artKey && artKey !== item.art_key) await assertArt(artKey, item.type);
  item.art_key = artKey;
  item.art_mime = artKey ? ART_MIME_BY_EXT[artExtensionOf(artKey)] : null;
}

export async function applyItemFields(
  item: CosmeticItem,
  dto: CollectibleItemDto,
  assertArt: ArtAsserter,
) {
  assertActiveType(dto.type);
  assertSlotUnchanged(item.type, dto.type);
  item.slug = dto.slug;
  item.name = dto.name;
  item.description = dto.description;
  item.type = dto.type;
  item.rarity = dto.rarity;
  item.price = dto.price;
  item.visual_value = dto.visualValue ?? item.visual_value ?? '';
  assertThemeValue(item.type, item.visual_value);
  applyAppearance(item, dto);
  applySchedule(item, dto);
  await applyArt(item, dto.artKey, assertArt);
}
