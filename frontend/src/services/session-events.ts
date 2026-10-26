export const SESSION_RENEWED_EVENT = 'secureplay:session-renewed';

/** Cookie HttpOnly já foi aplicado pelo navegador; nenhum token passa pelo evento. */
export function notifySessionRenewed(): void {
  window.dispatchEvent(new Event(SESSION_RENEWED_EVENT));
}
