import { Transform, Type } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { UpdateTemaDto } from './update-tema.dto';
import { UpdateCompanyParametersDto } from './update-company-parameters.dto';
import { CompanyRegistrationDto } from './company-registration.dto';

export class UpdateCompanySettingsDto extends UpdateTemaDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CompanyRegistrationDto)
  cadastro?: CompanyRegistrationDto;
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nome?: string;

  @IsOptional()
  @ValidateNested()
  @Type(() => UpdateCompanyParametersDto)
  parametros?: UpdateCompanyParametersDto;
}
