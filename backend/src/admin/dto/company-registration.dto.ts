import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CompanyRegistrationDto {
  @IsOptional() @IsString() @MaxLength(180) razao_social?: string | null;
  @IsOptional() @IsString() @MaxLength(24) cnpj?: string | null;
  @IsOptional() @IsString() @MaxLength(100) unidade?: string | null;
  @IsOptional() @IsString() @MaxLength(100) contato_nome?: string | null;
  @IsOptional() @IsString() @MaxLength(100) contato_email?: string | null;
  @IsOptional() @IsString() @MaxLength(24) contato_telefone?: string | null;
  @IsOptional() @IsString() @MaxLength(12) cep?: string | null;
  @IsOptional() @IsString() @MaxLength(180) logradouro?: string | null;
  @IsOptional() @IsString() @MaxLength(20) numero?: string | null;
  @IsOptional() @IsString() @MaxLength(100) complemento?: string | null;
  @IsOptional() @IsString() @MaxLength(100) bairro?: string | null;
  @IsOptional() @IsString() @MaxLength(100) cidade?: string | null;
  @IsOptional() @IsString() @MaxLength(2) uf?: string | null;
}

export class LookupCompanyCnpjDto {
  @IsString()
  @MaxLength(24)
  cnpj: string;
}
