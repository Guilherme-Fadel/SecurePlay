import { useEffect, useState } from 'react';
import { alphaBounds, type ArtBounds } from './artBounds';

export type ArtBoundsState =
  | { status: 'loading' }
  | { status: 'ready'; bounds: ArtBounds }
  | { status: 'failed' };

type Settled = Exclude<ArtBoundsState, { status: 'loading' }>;

const LOADING: ArtBoundsState = { status: 'loading' };
const FAILED: Settled = { status: 'failed' };
/** Mesma proporção da prancheta (239 × 270): basta para achar a caixa da arte. */
const SAMPLE_WIDTH = 239;
const SAMPLE_HEIGHT = 270;

const settled = new Map<string, Settled>();
const pending = new Map<string, Promise<Settled>>();

/** As URLs são assinadas e mudam a cada resposta; o arquivo é o mesmo sem a query. */
function cacheKey(url: string): string {
  const cut = url.search(/[?#]/);
  return cut < 0 ? url : url.slice(0, cut);
}

/** Lê a caixa visível de uma imagem já permitida para leitura (CORS ou mesma origem). */
function boundsOf(src: string, cors: boolean): Promise<Settled> {
  return new Promise((resolve) => {
    const image = new Image();
    if (cors) image.crossOrigin = 'anonymous';
    image.decoding = 'async';
    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = SAMPLE_WIDTH;
        canvas.height = SAMPLE_HEIGHT;
        const context = canvas.getContext('2d', { willReadFrequently: true });
        if (!context) return resolve(FAILED);
        context.drawImage(image, 0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const { data } = context.getImageData(0, 0, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        const bounds = alphaBounds(data, SAMPLE_WIDTH, SAMPLE_HEIGHT);
        resolve(bounds ? { status: 'ready', bounds } : FAILED);
      } catch {
        resolve(FAILED); // canvas "tainted" (SecurityError) ou imagem ilegível
      }
    };
    image.onerror = () => resolve(FAILED);
    image.src = src;
  });
}

/**
 * Segunda tentativa: se o navegador já tinha a arte em cache sem CORS (carregada pelo personagem), a
 * leitura acima falha. Busca de novo sem cache, em modo CORS, e mede a cópia local (mesma origem).
 */
async function boundsFromFreshCopy(url: string): Promise<Settled> {
  if (!/^https?:/i.test(url)) return FAILED;
  try {
    const response = await fetch(url, { mode: 'cors', cache: 'no-store', credentials: 'omit' });
    if (!response.ok) return FAILED;
    const local = URL.createObjectURL(await response.blob());
    try { return await boundsOf(local, false); } finally { URL.revokeObjectURL(local); }
  } catch {
    return FAILED;
  }
}

async function measure(url: string): Promise<Settled> {
  const first = await boundsOf(url, true);
  return first.status === 'ready' ? first : boundsFromFreshCopy(url);
}

function load(url: string): Promise<Settled> {
  const key = cacheKey(url);
  const done = settled.get(key);
  if (done) return Promise.resolve(done);
  const running = pending.get(key);
  if (running) return running;
  const task = measure(url).then((result) => {
    settled.set(key, result);
    pending.delete(key);
    return result;
  });
  pending.set(key, task);
  return task;
}

/** Caixa da arte (fração da prancheta) lida do alfa da própria imagem; `failed` se não der para medir. */
export function useArtBounds(artUrl: string | null): ArtBoundsState {
  const [fetched, setFetched] = useState<{ key: string; result: Settled } | null>(null);
  const key = artUrl ? cacheKey(artUrl) : null;

  useEffect(() => {
    if (!artUrl || !key || settled.has(key)) return undefined;
    let active = true;
    void load(artUrl).then((result) => { if (active) setFetched({ key, result }); });
    return () => { active = false; };
  }, [artUrl, key]);

  if (!key) return FAILED;
  const cached = settled.get(key);
  if (cached) return cached;
  return fetched?.key === key ? fetched.result : LOADING;
}
