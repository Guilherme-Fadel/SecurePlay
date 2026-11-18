import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

/** Tipos que o endpoint manual aceita; os demais só nascem de eventos do sistema. */
export const MANUAL_NOTIFICATION_TYPES = ['aviso', 'gestao'] as const;

export class CreateNotificationDto {
  @IsNotEmpty()
  @IsNumber()
  usuario_id: number;

  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  title: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(250)
  message: string;

  @IsOptional()
  @IsString()
  @IsIn(MANUAL_NOTIFICATION_TYPES)
  type?: string = 'aviso';

  // Sanitizado no service: só rotas internas permitidas, senão fica sem link.
  @IsOptional()
  @IsString()
  @MaxLength(200)
  link?: string | null;
}

export interface NotificationResponseDto {
  id: number;
  usuario_id: number;
  title: string;
  message: string;
  type: string;
  link: string | null;
  readed: boolean;
  created_at: Date;
}
