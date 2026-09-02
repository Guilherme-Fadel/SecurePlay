import {
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsSecurePassword } from '../../common/validators/password.validator';

export class CompleteCadastroConviteDto {
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

  @IsSecurePassword()
  password: string;
}
