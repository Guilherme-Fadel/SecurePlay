import { IsEmail, IsNotEmpty, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class LoginDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  identifier?: string;

  // Mantido para clientes legados durante a transição para identifier.
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsNotEmpty()
  password: string;
}
