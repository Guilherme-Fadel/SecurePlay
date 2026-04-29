import { api } from './api'

export interface CurrentUser{
    userId: number;
    name: string;
    email: string;
    level: number;
}

export async function getMe(): Promise<CurrentUser>{
    const response = await api.get('/auth/token');
    return response.data;
}