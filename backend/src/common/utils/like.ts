/** Caractere de escape usado por `padraoLike` (o padrão do MySQL). */
export const CARACTERE_ESCAPE_LIKE = '\\';

/**
 * Cláusula SQL coerente com `padraoLike`. O literal `'\\'` em SQL MySQL
 * representa uma única barra invertida.
 */
export const CLAUSULA_ESCAPE_LIKE = "ESCAPE '\\\\'";

/** Escapa `\`, `%` e `_` e envolve o termo com `%` para busca "contém". */
export function padraoLike(texto: string): string {
  return `%${texto.replace(/[\\%_]/g, (char) => `${CARACTERE_ESCAPE_LIKE}${char}`)}%`;
}
