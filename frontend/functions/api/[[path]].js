// Only the server-side binding chooses the upstream: never accept a target URL
// from the client. The browser always calls this site's /api route.
export async function onRequest({ request, env }) {
  const incoming = new URL(request.url);
  const fail = (status, message) => Response.json({ message }, {
    status,
    headers: { 'Cache-Control': 'private, no-store' },
  });

  let upstream;
  try {
    upstream = new URL(env.API_ORIGIN);
    if (upstream.protocol !== 'https:' || upstream.username || upstream.password
      || upstream.pathname !== '/' || upstream.search || upstream.hash
      || upstream.origin === incoming.origin) throw new Error('Invalid origin');
  } catch {
    return fail(503, 'API indisponível: configuração do servidor pendente.');
  }

  const origin = request.headers.get('Origin');
  const fetchSite = request.headers.get('Sec-Fetch-Site');
  const isUpgrade = request.headers.get('Upgrade')?.toLowerCase() === 'websocket';
  const isWrite = !['GET', 'HEAD', 'OPTIONS'].includes(request.method);
  if (fetchSite === 'cross-site' || (origin && origin !== incoming.origin)
    || ((isWrite || isUpgrade) && !origin)) {
    return fail(403, 'Origem da solicitação não permitida.');
  }

  // Assign pathname rather than resolving an untrusted path as a URL, so even
  // /api//another-host cannot change the configured upstream host.
  upstream.pathname = incoming.pathname.replace(/^\/api(?=\/|$)/, '') || '/';
  upstream.search = incoming.search;
  const headers = new Headers(request.headers);
  headers.delete('Host');
  // Same-origin GET/polling may omit Origin; the backend's Socket.IO allowRequest
  // still checks it. Preserve supplied origins and reject cross-site requests above.
  if (!origin) headers.set('Origin', incoming.origin);

  try {
    const outgoing = new Request(upstream, request);
    const response = await fetch(new Request(outgoing, {
      headers,
      redirect: 'manual',
    }), { cf: { cacheTtl: 0, cacheEverything: false } });

    // Pass the upgrade through without terminating the WebSocket in the Worker.
    if (response.status === 101) return response;

    // Never redirect a browser (or forward its credentials) to another origin.
    if (response.status >= 300 && response.status < 400) {
      return fail(502, 'A API retornou um redirecionamento inesperado.');
    }
    const result = new Response(response.body, response);
    result.headers.set('Cache-Control', 'private, no-store');
    // Keep Set-Cookie unchanged. Render must use a host-only cookie (no Domain).
    return result;
  } catch {
    return fail(502, 'Não foi possível conectar à API. Tente novamente.');
  }
}
