export type Mode = 'login' | 'register';

export interface LoginResult {
  sucesso: boolean;
  mensagem: string;
  token?: string;
  nome?: string;
}

export interface RegisterResult {
  sucesso: boolean;
  mensagem: string;
}