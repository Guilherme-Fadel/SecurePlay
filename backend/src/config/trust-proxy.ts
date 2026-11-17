export type TrustProxySetting =
  | false
  | ((address: string, hop: number) => boolean);

/**
 * Lê `TRUST_PROXY` (número de saltos de proxy confiáveis) para o Fastify.
 *
 * O Fastify 5.12 desativou `trustProxy` numérico: o número passou a não
 * confiar em nenhum proxy, e todos os clientes atrás do Render dividiriam um
 * único IP (e um único contador do throttler). Esta função preserva a
 * semântica anterior do proxy-addr (`hop < n`) até a fonte do IP passar a
 * ser uma cadeia de proxies validada.
 */
export function trustProxyFromEnv(
  raw: string | undefined = process.env.TRUST_PROXY,
): TrustProxySetting {
  const text = raw?.trim() ?? '';
  if (!/^\d+$/.test(text)) return false;
  const hops = Number(text);
  if (!Number.isSafeInteger(hops) || hops <= 0) return false;
  return (_address: string, hop: number) => hop < hops;
}

/**
 * IP do cliente numa requisição Node crua (ex.: handshake do Socket.IO), com a mesma regra
 * do proxy-addr usado pelo Fastify: percorre o socket e o X-Forwarded-For do mais próximo ao
 * mais distante e para no primeiro salto não confiável.
 */
export function forwardedClientIp(
  remoteAddress: string | undefined,
  forwardedFor: string | string[] | undefined,
  setting: TrustProxySetting = trustProxyFromEnv(),
): string {
  const socketAddress = remoteAddress ?? '';
  if (setting === false) return socketAddress;
  const header = Array.isArray(forwardedFor)
    ? forwardedFor.join(',')
    : (forwardedFor ?? '');
  const forwarded = header
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean)
    .reverse();
  const chain = [socketAddress, ...forwarded];
  for (let hop = 0; hop < chain.length - 1; hop += 1) {
    if (!setting(chain[hop], hop)) return chain[hop];
  }
  return chain[chain.length - 1];
}
