/** Parte da requisição que o Fastify entrega ao serializador de log. */
export interface LoggedRequest {
  method?: string;
  url?: string;
  host?: string;
  ip?: string;
  headers?: Record<string, string | string[] | undefined>;
  socket?: { remotePort?: number };
}

/** URL sem query string nem fragmento: buscas da gestão trazem nomes e e-mails. */
export function urlWithoutQuery(url: string | undefined): string | undefined {
  if (url === undefined) return undefined;
  const end = url.search(/[?#]/);
  return end === -1 ? url : url.slice(0, end);
}

/**
 * Serializador de `req` do log do Fastify. Mantém o que o padrão registrava (método, URL,
 * versão, host, IP e porta), mas a URL sai sem a query string e nenhum cabeçalho é gravado.
 */
export function serializeRequestForLog(req: LoggedRequest) {
  const version = req.headers?.['accept-version'];
  return {
    method: req.method,
    url: urlWithoutQuery(req.url),
    version: Array.isArray(version) ? version.join(',') : version,
    host: req.host,
    remoteAddress: req.ip,
    remotePort: req.socket?.remotePort,
  };
}
