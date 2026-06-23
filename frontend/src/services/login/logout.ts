import { api } from "@/services/api";

export async function logoutUser() {
  const response = await api.post('/auth/logout');
  localStorage.removeItem('nome');

  return response.data;
}
