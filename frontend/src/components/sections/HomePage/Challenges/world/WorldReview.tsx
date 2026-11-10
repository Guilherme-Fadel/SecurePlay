import { Check, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { Children, useState, type ReactNode } from 'react';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';

interface WorldReviewListProps {
  /** `WorldReviewItem`s. */
  children: ReactNode;
  /** Nome acessível da lista. Padrão: "Resultado de cada pergunta". */
  label?: string;
  /** Um item por página. Padrão: só nas telas baixas de notebook (mesmo critério do antigo `GameReviewItems`). */
  paged?: boolean;
}

/** Lista de revisão do resultado. Em telas baixas de notebook mostra um item por vez, com Anterior/Próxima. */
export function WorldReviewList({ children, label = 'Resultado de cada pergunta', paged }: WorldReviewListProps) {
  const notebook = useNotebookLayout();
  const compact = paged ?? notebook;
  const [page, setPage] = useState(0);
  const items = Children.toArray(children);
  const safePage = Math.min(page, Math.max(0, items.length - 1));
  const visible = compact ? items.slice(safePage, safePage + 1) : items;
  const pagerLabel = 'Revisão da missão';

  return (
    <>
      <ol className="gw-rv" aria-label={label}>{visible}</ol>
      {compact && items.length > 1 && (
        <nav className="gw-pager" aria-label={pagerLabel}>
          <button type="button" className="gw-btn sm ghost" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)} aria-label={`${pagerLabel}: página anterior`}>
            <ChevronLeft size={16} aria-hidden="true" />Anterior
          </button>
          <span aria-live="polite">{safePage + 1} de {items.length}</span>
          <button type="button" className="gw-btn sm ghost" disabled={safePage >= items.length - 1} onClick={() => setPage(safePage + 1)} aria-label={`${pagerLabel}: próxima página`}>
            Próxima<ChevronRight size={16} aria-hidden="true" />
          </button>
        </nav>
      )}
    </>
  );
}

interface WorldReviewItemProps {
  /** Acertou (marca azul com check) ou não (marca preta com X). */
  ok: boolean;
  /** Linha em destaque, ex.: "Pergunta 3: acertou!". */
  title: ReactNode;
  /** Linhas de apoio (cada uma vira um parágrafo). */
  lines?: ReactNode[];
  /** Conteúdo livre depois das linhas. */
  children?: ReactNode;
}

/** Um item da revisão: marca de certo/errado, título e linhas. */
export function WorldReviewItem({ ok, title, lines = [], children }: WorldReviewItemProps) {
  return (
    <li className={ok ? 'ok' : 'no'}>
      <span className="gw-rv-mk" aria-hidden="true">
        {ok ? <Check size={16} strokeWidth={3} /> : <X size={16} strokeWidth={3} />}
      </span>
      <div>
        <strong>{title}</strong>
        {lines.map((line, index) => <p key={index}>{line}</p>)}
        {children}
      </div>
    </li>
  );
}
