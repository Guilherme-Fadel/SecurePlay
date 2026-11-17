import {
  IsDateString,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';
import { RegistrationContactDto } from './registration-contact.dto';

export class TrialRegisterDto extends RegistrationContactDto {
  @IsDateString({ strict: true })
  birth_date: string;

  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsEmail()
  @MaxLength(100)
  email: string;

  /** Token do Cloudflare Turnstile; exigido só quando TURNSTILE_SECRET_KEY existe. */
  @IsOptional()
  @IsString()
  @MaxLength(2048)
  turnstile_token?: string;
}
