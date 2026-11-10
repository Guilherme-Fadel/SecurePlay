import { LockReason } from './jornada-regras';

const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;

function dois(valor: number): string {
  return String(valor).padStart(2, '0');
}

/** "DD/MM às HH:MM" no horário de Brasília (-03:00, sem horário de verão). */
export function formatarAberturaBrasilia(data: Date): string {
  const local = new Date(data.getTime() - BRASILIA_OFFSET_MS);
  return `${dois(local.getUTCDate())}/${dois(local.getUTCMonth() + 1)} às ${dois(local.getUTCHours())}:${dois(local.getUTCMinutes())}`;
}

export function mensagemDeBloqueio(
  reason: LockReason,
  opensAt: Date | null,
): string {
  if (reason === 'scheduled' && opensAt)
    return `Esta aula abre em ${formatarAberturaBrasilia(opensAt)}.`;
  if (reason === 'awaiting_teacher')
    return 'Esta aula ainda não foi aberta pelo professor.';
  if (reason === 'outside_journey')
    return 'Esta aula não faz parte da jornada da turma.';
  return 'Conclua a aula anterior primeiro.';
}
