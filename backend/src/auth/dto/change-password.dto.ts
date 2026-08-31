import { IsNotEmpty, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @MinLength(6)
  @MaxLength(72)
  @Matches(/\S/, { message: 'A nova senha não pode conter apenas espaços.' })
  newPassword: string;
}
