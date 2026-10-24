import { Transform, Type } from 'class-transformer';
import { CompanyRegistrationDto } from './company-registration.dto';
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
  IsDefined,
  ValidateNested,
} from 'class-validator';

export class CreateEmpresaDto {
  @IsDefined()
  @ValidateNested()
  @Type(() => CompanyRegistrationDto)
  cadastro: CompanyRegistrationDto;
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  nome: string;

  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  @MaxLength(100)
  email_administrador: string;
}
