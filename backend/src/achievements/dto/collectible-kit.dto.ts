import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { CosmeticRarity } from '../entities/cosmetic-rarity';
import {
  ART_KEY_PATTERN,
  CollectibleAdjustDto,
  CollectibleScheduleDto,
  SLUG_PATTERN,
} from './collectible-item.dto';

export const KIT_PIECE_TYPES = [
  'skin',
  'head',
  'face',
  'neck',
  'effect',
] as const;
export type KitPieceType = (typeof KIT_PIECE_TYPES)[number];

export class KitPieceDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  id?: number;

  @IsIn(KIT_PIECE_TYPES)
  type: KitPieceType;

  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

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
}

export class CollectibleKitDto extends CollectibleScheduleDto {
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name: string;

  /** Até 70 caracteres: as peças derivam `<slug>-<encaixe>` dentro do limite de 80. */
  @IsString()
  @MaxLength(70)
  @Matches(SLUG_PATTERN, {
    message: 'slug deve usar letras minúsculas, números e hífens',
  })
  slug: string;

  @IsString()
  @MaxLength(400)
  description: string;

  @IsEnum(CosmeticRarity)
  rarity: CosmeticRarity;

  @IsInt()
  @Min(0)
  @Max(100000)
  price: number;

  @IsArray()
  @ArrayMaxSize(KIT_PIECE_TYPES.length)
  @ValidateNested({ each: true })
  @Type(() => KitPieceDto)
  pieces: KitPieceDto[];
}
