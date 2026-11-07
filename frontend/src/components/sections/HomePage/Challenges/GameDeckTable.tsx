import type { ReactNode } from 'react';

interface GameDeckTableProps {
  lead: string;
  busy?: boolean;
  children: ReactNode;
}

/** Mesa "Sua mão de cartas" (região rotulada) usada pelo baralho e pelos estados. */
export function GameDeckTable({ lead, busy, children }: GameDeckTableProps) {
  return (
    <section className="dk-table" aria-labelledby="dk-table-title" aria-busy={busy || undefined}>
      <div className="dk-top">
        <div>
          <h2 id="dk-table-title" className="dk-display">Sua mão de cartas</h2>
          <p>{lead}</p>
        </div>
      </div>
      {children}
    </section>
  );
}
