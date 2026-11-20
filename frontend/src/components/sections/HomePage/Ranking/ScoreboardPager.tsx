import { ChevronLeft, ChevronRight } from 'lucide-react';
import { scoreboardPageLabel } from './scoreboardModel';

interface ScoreboardPagerProps {
  page: number;
  pages: number;
  info: string;
  onGo: (delta: -1 | 1) => void;
}

/**
 * Anterior e próxima com a página X de Y (região educada: o leitor de tela anuncia a troca).
 * Nos limites o botão fica `aria-disabled` e não `disabled`, para o foco não se perder.
 */
export function ScoreboardPager({ page, pages, info, onGo }: ScoreboardPagerProps) {
  const first = page <= 0;
  const last = page >= pages - 1;
  return (
    <nav className="sb-pg" aria-label="Páginas do placar">
      <p className="sb-info">{info}</p>
      <div className="sb-pg-nav">
        <button type="button" aria-label="Página anterior do placar" aria-disabled={first || undefined} onClick={() => { if (!first) onGo(-1); }}>
          <ChevronLeft size={16} aria-hidden="true" /><span>Anterior</span>
        </button>
        <span className="sb-pg-label" role="status" aria-atomic="true">{scoreboardPageLabel(page, pages)}</span>
        <button type="button" aria-label="Próxima página do placar" aria-disabled={last || undefined} onClick={() => { if (!last) onGo(1); }}>
          <span>Próxima</span><ChevronRight size={16} aria-hidden="true" />
        </button>
      </div>
    </nav>
  );
}
