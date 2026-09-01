import { IsEmail, IsString, MinLength } from 'class-validator';
import { IsSecurePassword } from '../../common/validators/password.validator';

export class CompleteCadastroConviteDto {
  @IsString()
  @MinLength(3)
  name: string;

  @IsEmail()
  email: string;

  @IsSecurePassword()
  password: string;
}
