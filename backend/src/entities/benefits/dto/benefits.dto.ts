import { IsBoolean, IsNotEmpty, IsString } from 'class-validator';

export class CreateBenefitsDto {
  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  description: string;

  @IsNotEmpty()
  @IsString()
  icon: string;

  @IsNotEmpty()
  @IsString()
  color: string;

  @IsNotEmpty()
  @IsString()
  textColor: string;

  @IsNotEmpty()
  @IsString()
  borderColor: string;

  @IsBoolean()
  glow: boolean;
}
