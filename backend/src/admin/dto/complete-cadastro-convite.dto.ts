import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { IsSecurePassword } from '../../common/validators/password.validator';
import { RegistrationContactDto } from '../../registration/dto/registration-contact.dto';

export class CompleteCadastroConviteDto extends RegistrationContactDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsOptional()
  @IsEmail()
  @MaxLength(100)
  email?: string;

  @IsOptional()
  @IsDateString({ strict: true })
  birth_date?: string;

  @IsOptional()
  @IsSecurePassword()
  password?: string;

  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(24)
  @Matches(/^[\p{L}\p{N} _-]+$/u, {
    message: 'O apelido pode usar letras, números, espaço, hífen e sublinhado',
  })
  nickname?: string;
}
