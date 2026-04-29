import { api } from '../api';

export async function validateToken(): Promise<boolean> {
  try {
    await api.get('/auth/token');
    return true;
  } catch {
    return false;
  }
}
