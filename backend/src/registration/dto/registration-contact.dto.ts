import { Transform } from 'class-transformer';
import { IsOptional, IsString, Matches, MaxLength } from 'class-validator';

export class RegistrationUsernameDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() || undefined : value,
  )
  @IsOptional()
  @IsString()
  @Matches(/^(?!sp-)[a-z0-9][a-z0-9._-]{2,23}$/, {
    message:
      'Usuário: use 3 a 24 letras sem acento, números, ponto, hífen ou sublinhado; SP- é reservado.',
  })
  username?: string;
}

export class RegistrationContactDto extends RegistrationUsernameDto {
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string'
      ? value.trim().replace(/[\s().-]/g, '') || undefined
      : value,
  )
  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^\+?\d{8,15}$/, {
    message: 'Informe um telefone com 8 a 15 dígitos, incluindo o DDD.',
  })
  phone?: string;
}
