/**
 * Horários de abertura de aula são sempre de Brasília (-03:00, sem horário de verão),
 * independentemente do fuso do navegador do professor ou do aluno.
 */
const BRASILIA_OFFSET_MS = 3 * 60 * 60 * 1000;
const LOCAL = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function dois(valor: number): string {
  return String(valor).padStart(2, '0');
}

function emBrasilia(iso: string): Date {
  const data = new Date(iso);
  if (Number.isNaN(data.getTime())) throw new Error('Data inválida');
  return new Date(data.getTime() - BRASILIA_OFFSET_MS);
}

/** Valor de `<input type="datetime-local">` lido como horário de Brasília. */
export function brasiliaLocalToIso(local: string): string {
  if (!LOCAL.test(local)) throw new Error('Informe data e hora válidas');
  return `${local}:00-03:00`;
}

/** ISO do backend para preencher `<input type="datetime-local">` em Brasília. */
export function isoToBrasiliaLocal(iso: string): string {
  const local = emBrasilia(iso);
  return `${local.getUTCFullYear()}-${dois(local.getUTCMonth() + 1)}-${dois(local.getUTCDate())}T${dois(local.getUTCHours())}:${dois(local.getUTCMinutes())}`;
}

/** "18/11 às 8h" ou "18/11 às 8h30". */
export function formatarAbertura(iso: string): string {
  const local = emBrasilia(iso);
  const minutos = local.getUTCMinutes();
  return `${dois(local.getUTCDate())}/${dois(local.getUTCMonth() + 1)} às ${local.getUTCHours()}h${minutos ? dois(minutos) : ''}`;
}
