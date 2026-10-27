import { useEffect, useRef } from 'react';

/** Estado comum para validação de sessão e carregamento das rotas. */
export function PageLoading({ label = 'Carregando página...' }: { label?: string }) {
  const container = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // Anuncia a espera inicial sem tirar o foco de um controle em uso.
    if (document.activeElement === document.body) container.current?.focus();
  }, []);
  return (
    <div ref={container} role="status" aria-live="polite" aria-busy="true" tabIndex={-1}
      className="app-page flex min-h-64 items-center justify-center p-6 text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-[var(--primary)]">
      <p>{label}</p>
    </div>
  );
}
