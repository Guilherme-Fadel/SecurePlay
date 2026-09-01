import { IsEmail, IsString } from 'class-validator';
import { IsSecurePassword } from '../../common/validators/password.validator';

export class UsuarioCadastrarDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsSecurePassword()
  password: string;
}
