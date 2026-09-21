import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { BirthDateDto } from '../../registration/dto/birth-date.dto';

export class CompleteCadastroConviteDto extends BirthDateDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[\p{L}\p{N} _-]+$/u, {
    message: 'O apelido pode usar letras, números, espaço, hífen e sublinhado',
  })
  nickname?: string;

}
