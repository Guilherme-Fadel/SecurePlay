import { api } from "./api";

export interface Notification{
    id: number;
    usuario_id: number;
    title: string;
    message: string;
    type: string;
    readed: boolean;
    created_at: Date
}

export async function getNotification(usuario_id?: number): Promise<Notification[]>{
    const params = usuario_id ? { id: usuario_id } : {};
    const response = await api.get('/notification/buscar', { params });
    return response.data;
}

export async function markNotificationAsRead(id: number): Promise<void> {
    await api.patch(`/notification/ler/${id}`);
}

export async function markAllNotificationsAsRead(usuario_id: number): Promise<void> {
    await api.patch(`/notification/ler-todas/${usuario_id}`);
}

export function timeAgo(date: Date | string): string {
  const diff = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (diff < 60) return 'Agora mesmo';
  if (diff < 3600) return `Há ${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `Há ${Math.floor(diff / 3600)} hora${Math.floor(diff / 3600) > 1 ? 's' : ''}`;
  if (diff < 2592000) return `Há ${Math.floor(diff / 86400)} dia${Math.floor(diff / 86400) > 1 ? 's' : ''}`;
  return new Date(date).toLocaleDateString('pt-BR');
}