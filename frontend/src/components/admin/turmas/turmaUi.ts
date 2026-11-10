import { isAxiosError } from 'axios';

/** Anos oferecidos no cadastro e no filtro: o atual, o anterior e o próximo. */
export function anosLetivos(hoje = new Date()): number[] {
  const atual = hoje.getFullYear();
  return [atual + 1, atual, atual - 1];
}

/** Mensagem do backend (texto ou lista do ValidationPipe) ou a mensagem padrão da tela. */
export function mensagemDeErro(error: unknown, padrao: string): string {
  if (!isAxiosError(error)) return padrao;
  const message: unknown = (error.response?.data as { message?: unknown } | undefined)?.message;
  if (typeof message === 'string' && message.trim()) return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return padrao;
}

export function statusDoErro(error: unknown): number | undefined {
  return isAxiosError(error) ? error.response?.status : undefined;
}

/** Rotas da turma no console: escola do admin/professor (`/admin`) ou empresa da plataforma. */
export interface EscopoTurmas {
  empresaId?: number;
  base: string;
  gestao: boolean;
}

export function rotaTurma(escopo: EscopoTurmas, turmaId?: number, aba?: string): string {
  if (turmaId === undefined) return `${escopo.base}/turmas`;
  return `${escopo.base}/turmas/${turmaId}${aba ? `/${aba}` : ''}`;
}
