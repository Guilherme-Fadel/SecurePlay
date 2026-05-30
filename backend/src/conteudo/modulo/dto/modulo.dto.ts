import { IsString, IsEnum, IsInt, IsBoolean, IsOptional, MaxLength, Min } from 'class-validator';
import { ModuloType, ModuloDifficulty } from '../modulo.entity';

export class CreateModuloDto {
  @IsString()
  @MaxLength(150)
  title: string;

  @IsString()
  @MaxLength(1000)
  description: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  @IsEnum(ModuloType)
  type: ModuloType;

  @IsString()
  @MaxLength(100)
  category: string;

  @IsEnum(ModuloDifficulty)
  difficulty: ModuloDifficulty;

  @IsInt()
  @Min(0)
  xp_total: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xp_bonus?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateModuloDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  thumbnail?: string;

  @IsOptional()
  @IsEnum(ModuloType)
  type?: ModuloType;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  category?: string;

  @IsOptional()
  @IsEnum(ModuloDifficulty)
  difficulty?: ModuloDifficulty;

  @IsOptional()
  @IsInt()
  @Min(0)
  xp_total?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xp_bonus?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
