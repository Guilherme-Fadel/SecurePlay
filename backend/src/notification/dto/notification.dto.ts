import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  MaxLength,
} from 'class-validator';

// Tipos realmente usados: 'achievement' é gravado pelo backend (conclusão de
// módulo) e os demais são os que o ícone do frontend (NotificationsMenu)
// reconhece; qualquer outro valor cairia no ícone genérico.
export const NOTIFICATION_TYPES = [
  'achievement',
  'info',
  'alert',
  'reward',
  'conquista',
  'seguranca',
] as const;

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

  @IsNotEmpty()
  @IsString()
  @IsIn(NOTIFICATION_TYPES)
  type: string;
}

export interface NotificationResponseDto {
  id: number;
  usuario_id: number;
  title: string;
  message: string;
  type: string;
  readed: boolean;
  created_at: Date;
}
