import { formatarAbertura } from '@/lib/brasiliaTime';

export type LockReason = 'sequence' | 'scheduled' | 'awaiting_teacher' | 'outside_journey';

const AULAS_ANTERIORES = 'Conclua as aulas anteriores para liberar esta aula.';

/** Bloqueio que vem da turma (professor), não da sequência de aulas. */
export function bloqueioDaTurma(reason: LockReason | null | undefined): boolean {
  return reason === 'scheduled' || reason === 'awaiting_teacher' || reason === 'outside_journey';
}

/** Motivo do bloqueio vindo do backend; `padrao` mantém o texto de sequência de cada tela. */
export function textoDeBloqueio(
  reason: LockReason | null | undefined,
  opensAt: string | null | undefined,
  padrao = AULAS_ANTERIORES,
): string {
  if (reason === 'scheduled' && opensAt) return `Abre em ${formatarAbertura(opensAt)}`;
  if (reason === 'awaiting_teacher') return 'Aguardando o professor';
  if (reason === 'outside_journey') return 'Fora da jornada da turma';
  return padrao;
}
