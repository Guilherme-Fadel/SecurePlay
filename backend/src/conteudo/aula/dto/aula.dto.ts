import { IsString, IsEnum, IsInt, IsBoolean, IsOptional, IsArray, MaxLength, Min } from 'class-validator';
import { AulaType } from '../aula.entity';

export class CreateAulaDto {
  @IsInt()
  modulo_id: number;

  @IsString()
  @MaxLength(150)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsEnum(AulaType)
  type: AulaType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  content_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pages?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsInt()
  @Min(0)
  xp: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  section_name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class UpdateAulaDto {
  @IsOptional()
  @IsString()
  @MaxLength(150)
  title?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  description?: string;

  @IsOptional()
  @IsEnum(AulaType)
  type?: AulaType;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  content_url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  pages?: string[];

  @IsOptional()
  @IsInt()
  @Min(0)
  duration?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  xp?: number;

  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  section_name?: string;

  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
