import { Type } from 'class-transformer';
import { IsBoolean, IsEmail, IsInt, IsOptional, Max, Min } from 'class-validator';

export class CreateConviteDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(30)
  validade_dias?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  max_uses?: number;

  @IsOptional()
  @IsBoolean()
  administrador?: boolean;
}
