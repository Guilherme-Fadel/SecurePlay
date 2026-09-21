import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import { BirthDateDto } from './birth-date.dto';

export class TrialRegisterDto extends BirthDateDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  name: string;

  @IsEmail()
  email: string;
}
