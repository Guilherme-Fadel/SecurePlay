import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

/** Exatamente um dos dois campos; a conferência de "um só" fica no serviço. */
export class MfaVerifyDto {
  @IsOptional()
  @IsString()
  @Matches(/^\d{6}$/, { message: 'O código deve ter 6 dígitos.' })
  code?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  recoveryCode?: string;
}
