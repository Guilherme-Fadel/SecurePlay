import { IsDateString } from 'class-validator';

export class BirthDateDto {
  @IsDateString({ strict: true })
  birth_date: string;
}
