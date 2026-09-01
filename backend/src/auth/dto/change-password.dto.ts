import { IsNotEmpty, IsString } from 'class-validator';
import { IsSecurePassword } from '../../common/validators/password.validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsSecurePassword()
  newPassword: string;
}
