// Files in /assets carry a content hash in their name, so a real file never changes
// and can be cached for a year. A missing file must not fall back to index.html: during
// a deploy that HTML would be cached under the .js name for a year and the app would
// load a blank page until the cache is purged. Missing files return an uncached 404.
const IMMUTABLE = 'public, max-age=31536000, immutable';

export async function onRequest({ next }) {
  const response = await next();
  const type = response.headers.get('Content-Type') ?? '';

  if (response.status >= 400 || type.includes('text/html')) {
    return new Response('Arquivo não encontrado.', {
      status: 404,
      headers: {
        'Cache-Control': 'no-store',
        'Content-Type': 'text/plain; charset=utf-8',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  }

  // _headers is not applied to Function responses, so the cache policy lives here.
  const result = new Response(response.body, response);
  if (response.status === 200) result.headers.set('Cache-Control', IMMUTABLE);
  result.headers.set('X-Content-Type-Options', 'nosniff');
  return result;
}
