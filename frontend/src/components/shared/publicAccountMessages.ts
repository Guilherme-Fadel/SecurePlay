/** Leitura defensiva do corpo de erro do backend nas telas públicas de conta. */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function responseData(error: unknown): Record<string, unknown> | null {
  if (!isRecord(error)) return null;
  const response = error.response;
  if (!isRecord(response)) return null;
  const data = response.data;
  return isRecord(data) ? data : null;
}

/** Mensagem enviada pelo backend (texto ou lista de textos) ou o texto padrão da tela. */
export function backendMessage(error: unknown, fallback: string): string {
  const message = responseData(error)?.message;
  if (typeof message === 'string' && message) return message;
  if (Array.isArray(message)) {
    const parts = message.filter((part): part is string => typeof part === 'string' && part.length > 0);
    if (parts.length) return parts.join('. ');
  }
  return fallback;
}

export function backendCode(error: unknown): string | undefined {
  const code = responseData(error)?.code;
  return typeof code === 'string' ? code : undefined;
}

/** Token enviado no hash da URL (#token), fora do histórico do servidor. */
export function readHashToken(): string {
  return window.location.hash.startsWith('#') ? window.location.hash.slice(1) : '';
}
