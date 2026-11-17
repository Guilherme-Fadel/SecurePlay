import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import './turnstile-field.css';

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

/** Chave pública do widget; sem ela (local e testes) a verificação fica desligada. */
const SITE_KEY = ((import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? '').trim();

interface TurnstileApi {
  render(container: HTMLElement, options: Record<string, unknown>): string;
  remove(widgetId: string): void;
}

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptLoading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  scriptLoading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('turnstile')));
    script.onerror = () => {
      scriptLoading = null;
      reject(new Error('turnstile'));
    };
    document.head.appendChild(script);
  });
  return scriptLoading;
}

function TurnstileField({ onToken }: { onToken: (token: string | undefined) => void }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let widgetId: string | undefined;
    loadTurnstile()
      .then((api) => {
        if (!active || !containerRef.current) return;
        widgetId = api.render(containerRef.current, {
          sitekey: SITE_KEY,
          language: 'pt-br',
          callback: (token: string) => onToken(token),
          'expired-callback': () => onToken(undefined),
          'error-callback': () => {
            onToken(undefined);
            setFailed(true);
          },
        });
      })
      .catch(() => {
        if (active) setFailed(true);
      });
    return () => {
      active = false;
      if (widgetId) window.turnstile?.remove(widgetId);
    };
  }, [onToken]);

  return (
    <div className="turnstile-field">
      <div ref={containerRef} />
      {failed && (
        <p className="turnstile-field-error" role="alert">
          Não foi possível carregar a verificação de segurança. Recarregue a página e tente de novo.
        </p>
      )}
    </div>
  );
}

export interface TurnstileState {
  /** Token atual (undefined enquanto a verificação não terminou ou quando está desligada). */
  token: string | undefined;
  /** Pode enviar: verificação concluída ou desligada. */
  ready: boolean;
  /** Gera um widget novo; o token do Turnstile vale para um único envio. */
  reset: () => void;
  widget: ReactElement | null;
}

/** Verificação do Cloudflare Turnstile nos formulários públicos (cadastro, reenvio, esqueci senha). */
export function useTurnstile(): TurnstileState {
  const [token, setToken] = useState<string | undefined>();
  const [generation, setGeneration] = useState(0);
  const onToken = useCallback((next: string | undefined) => setToken(next), []);
  const reset = useCallback(() => {
    if (!SITE_KEY) return;
    setToken(undefined);
    setGeneration((current) => current + 1);
  }, []);
  return {
    token,
    ready: !SITE_KEY || Boolean(token),
    reset,
    widget: SITE_KEY ? <TurnstileField key={generation} onToken={onToken} /> : null,
  };
}
