import axios from 'axios';
import { API_BASE_URL } from './api-config';

export const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  headers: {
    'X-Requested-With': 'SecurePlay',
  },
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('nome');

      // /auth/me é consultado também nas telas públicas para detectar uma sessão.
      // A ausência de sessão deve ser tratada pelo guard da rota, sem navegação global.
      if (error.config?.url === '/auth/me') {
        return Promise.reject(error);
      }

      const publicPaths = ['/', '/login', '/start'];
      if (!publicPaths.includes(window.location.pathname)) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);
