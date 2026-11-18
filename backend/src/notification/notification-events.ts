/** Contrato dos eventos de domínio que geram notificações (best-effort, após o commit da origem). */
export const NOTIFICATION_EVENTS = {
  conquistaDesbloqueada: 'notificacao.conquista-desbloqueada',
  nivelAlcancado: 'notificacao.nivel-alcancado',
  temporadaFechada: 'notificacao.temporada-fechada',
  apelidoDecidido: 'notificacao.apelido-decidido',
  apelidoSolicitado: 'notificacao.apelido-solicitado',
  moduloPublicado: 'notificacao.modulo-publicado',
  alunoEntrouTurma: 'notificacao.aluno-entrou-turma',
  senhaAlterada: 'notificacao.senha-alterada',
  mfaAlterado: 'notificacao.mfa-alterado',
} as const;

export interface ConquistaDesbloqueadaPayload {
  usuarioId: number;
  conquistaId: number;
  titulo: string;
}

export interface NivelAlcancadoPayload {
  usuarioId: number;
  nivel: number;
  prestigio?: number;
}

export interface TemporadaFechadaPayload {
  seasonId: string;
  rotulo: string;
  posicoes: Array<{ usuarioId: number; posicao: number; pontos: number }>;
}

export interface ApelidoDecididoPayload {
  usuarioId: number;
  aprovado: boolean;
  apelido: string;
}

export interface ApelidoSolicitadoPayload {
  empresaId: number;
}

export interface ModuloPublicadoPayload {
  moduloId: number;
  titulo: string;
}

export interface AlunoEntrouTurmaPayload {
  turmaId: number;
  usuarioId: number;
}

export interface SenhaAlteradaPayload {
  usuarioId: number;
  origem: 'perfil' | 'recuperacao' | 'gestao';
}

export interface MfaAlteradoPayload {
  usuarioId: number;
  ativado: boolean;
}
