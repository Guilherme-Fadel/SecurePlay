import { IsOptional, IsString, Matches } from 'class-validator';

/** Cor em hexadecimal #RRGGBB; só vale para itens recoloríveis ou fundo personalizado. */
export const COSMETIC_COLOR_PATTERN = /^#[0-9A-Fa-f]{6}$/;

export class EquipCosmeticDto {
  @IsOptional()
  @IsString()
  @Matches(COSMETIC_COLOR_PATTERN, {
    message: 'A cor deve estar no formato #RRGGBB',
  })
  color?: string | null;
}
