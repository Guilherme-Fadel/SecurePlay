import {
  IsDateString,
  IsEmail,
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
}
