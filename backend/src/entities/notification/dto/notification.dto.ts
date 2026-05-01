import { IsBoolean, IsNotEmpty, IsString, IsNumber, IsDate } from 'class-validator';

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsNumber()
  usuario_id: number;

  @IsNotEmpty()
  @IsString()
  title: string;

  @IsNotEmpty()
  @IsString()
  message: string;

  @IsNotEmpty()
  @IsString()
  type: string;

  @IsNotEmpty()
  @IsBoolean()
  readed: boolean;

  @IsNotEmpty()
  @IsDate()
  created_at: Date;
}
