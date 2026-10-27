import { useCallback, useEffect, useState } from 'react';

/** O frame é um background CSS: detecta falhas que o elemento do livro não emite. */
export function useModuleBookFrame(src: string | undefined) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ src: string | undefined; attempt: number; status: 'ready' | 'error' } | null>(null);
  useEffect(() => {
    if (!src) return;
    const image = new Image();
    const finish = (status: 'ready' | 'error') => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      setResult({ src, attempt, status });
    };
    const timer = window.setTimeout(() => finish('error'), 15_000);
    image.onload = () => finish('ready');
    image.onerror = () => finish('error');
    image.src = src;
    return () => {
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
    };
  }, [src, attempt]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const status = !src ? 'error' : result?.src === src && result.attempt === attempt ? result.status : 'loading';
  return { status, retry };
}
