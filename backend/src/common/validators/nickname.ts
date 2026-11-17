// Padrão único de apelido, usado pelo aluno (pedido) e pelo admin (edição).
export const NICKNAME_PATTERN = /^[\p{L}\p{N} _-]+$/u;

export const NICKNAME_MESSAGE =
  'O apelido pode usar letras, números, espaço, hífen e sublinhado';
