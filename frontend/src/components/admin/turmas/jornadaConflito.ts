import type { JornadaEdicao } from '@/services/turmas';

/**
 * Depois de um 409 em "Abrir agora", já com a jornada recarregada: se a aula aparece aberta foi
 * clique duplo ou outro professor (aviso); senão a recusa é real (ex.: turma arquivada).
 */
export function resultadoDoConflito(jornada: Pick<JornadaEdicao, 'modulos'>, aulaId: number, titulo: string, mensagem: string): { aviso: string } | { erro: string } {
  const aula = jornada.modulos.flatMap((modulo) => modulo.aulas).find((item) => item.aula_id === aulaId);
  return aula?.estado === 'aberta' ? { aviso: `${titulo} já estava aberta.` } : { erro: mensagem };
}
