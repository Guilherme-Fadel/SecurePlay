import {
  IsNotEmpty,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class ChangeUserStatusDto {
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/)
  @MinLength(5)
  @MaxLength(300)
  motivo: string;
}
