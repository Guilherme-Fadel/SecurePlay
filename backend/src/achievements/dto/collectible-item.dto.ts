import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { ACTIVE_TYPES, RETIRED_TYPE_MESSAGE } from '../retired-types';
import type { CosmeticType } from '../entities/cosmetic-item.entity';
import { CosmeticRarity } from '../entities/cosmetic-rarity';

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
/** `YYYY-MM-DD` (dia inteiro em Brasília) ou data e hora ISO completa. */
export const AVAILABILITY_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:T[\d:.]+(?:Z|[+-]\d{2}:\d{2}))?$/;
/** Arte já confirmada: `s3://<bucket>/collectibles/<uuid>.(png|svg)`. */
export const ART_KEY_PATTERN =
  /^s3:\/\/[A-Za-z0-9.-]+\/collectibles\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.(png|svg)$/;

export class CollectibleAdjustDto {
  @IsOptional()
  @IsNumber()
  @Min(-500)
  @Max(500)
  x?: number;

  @IsOptional()
  @IsNumber()
  @Min(-500)
  @Max(500)
  y?: number;

  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(5)
  scale?: number;
}

/** Campos de janela de venda e liberação comuns a itens e kits. */
export class CollectibleScheduleDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  festiveEvent?: string | null;

  @IsOptional()
  @IsString()
  @Matches(AVAILABILITY_PATTERN, { message: 'availableFrom inválido' })
  availableFrom?: string | null;

  @IsOptional()
  @IsString()
  @Matches(AVAILABILITY_PATTERN, { message: 'availableUntil inválido' })
  availableUntil?: string | null;

  /** Validada por `parseUnlockRule`; nulo ou ausente significa sem requisitos. */
  @IsOptional()
  @IsObject()
  unlockRule?: Record<string, unknown> | null;
}

export class CollectibleItemDto extends CollectibleScheduleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  @IsString()
  @MaxLength(80)
  @Matches(SLUG_PATTERN, {
    message: 'slug deve usar letras minúsculas, números e hífens',
  })
  slug: string;

  @IsString()
  @MaxLength(400)
  description: string;

  @IsIn(ACTIVE_TYPES, { message: RETIRED_TYPE_MESSAGE })
  type: CosmeticType;

  @IsEnum(CosmeticRarity)
  rarity: CosmeticRarity;

  @IsInt()
  @Min(0)
  @Max(100000)
  price: number;

  @IsOptional()
  @IsString()
  @MaxLength(160)
  visualValue?: string;

  @IsOptional()
  @IsString()
  @Matches(ART_KEY_PATTERN, { message: 'artKey inválida' })
  artKey?: string | null;

  @IsOptional()
  @IsIn(['back', 'front'])
  layer?: 'back' | 'front';

  @IsOptional()
  @IsBoolean()
  recolorable?: boolean;

  @IsOptional()
  @ValidateNested()
  @Type(() => CollectibleAdjustDto)
  adjust?: CollectibleAdjustDto;

  /** Recusado: peças de kit nascem pelo kit. Existe só para responder 400 claro. */
  @IsOptional()
  @IsInt()
  kitId?: number | null;
}
