import {
  IsString,
  IsOptional,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type } from 'class-transformer';

export class PaletaDto {
  @IsString()
  primary: string;

  @IsString()
  secondary: string;

  @IsString()
  accent: string;

  @IsString()
  text_primary: string;

  @IsString()
  text_secondary: string;
}

export class UpdateTemaDto {
  @IsOptional()
  @IsObject()
  @ValidateNested()
  @Type(() => PaletaDto)
  paleta?: PaletaDto;

  @IsOptional()
  @IsString()
  logo_url?: string;
}
