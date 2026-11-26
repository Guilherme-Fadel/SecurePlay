import { IsIn } from 'class-validator';
import { CHARACTER_COLORS, type CharacterColor } from '../character-color';

export class CharacterColorDto {
  @IsIn(CHARACTER_COLORS, {
    message: `A cor deve ser uma de: ${CHARACTER_COLORS.join(', ')}`,
  })
  color!: CharacterColor;
}
