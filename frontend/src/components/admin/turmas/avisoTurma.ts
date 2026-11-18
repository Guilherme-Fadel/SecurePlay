export const AVISO_TITULO_MIN = 3;
export const AVISO_TITULO_MAX = 100;
export const AVISO_MENSAGEM_MIN = 3;
export const AVISO_MENSAGEM_MAX = 250;

export interface ValidacaoAviso {
  valido: boolean;
  titulo: string;
  mensagem: string;
  erroTitulo: string | null;
  erroMensagem: string | null;
}

function validarCampo(texto: string, rotulo: string, min: number, max: number): string | null {
  if (texto.length < min) return `${rotulo} precisa ter ao menos ${min} caracteres.`;
  if (texto.length > max) return `${rotulo} aceita no máximo ${max} caracteres.`;
  return null;
}

/** Espelha os limites do backend (texto aparado); o servidor continua sendo a autoridade. */
export function validarAviso(titulo: string, mensagem: string): ValidacaoAviso {
  const tituloAparado = titulo.trim();
  const mensagemAparada = mensagem.trim();
  const erroTitulo = validarCampo(tituloAparado, 'O título', AVISO_TITULO_MIN, AVISO_TITULO_MAX);
  const erroMensagem = validarCampo(mensagemAparada, 'A mensagem', AVISO_MENSAGEM_MIN, AVISO_MENSAGEM_MAX);
  return { valido: !erroTitulo && !erroMensagem, titulo: tituloAparado, mensagem: mensagemAparada, erroTitulo, erroMensagem };
}

export function resumoDoEnvio(enviados: number): string {
  if (enviados === 0) return 'Nenhum aluno ativo nesta turma para receber o aviso.';
  return `Aviso enviado para ${enviados} ${enviados === 1 ? 'aluno' : 'alunos'}.`;
}
