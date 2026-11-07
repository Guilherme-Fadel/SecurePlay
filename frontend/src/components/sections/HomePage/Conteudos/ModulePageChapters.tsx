import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Folder } from 'lucide-react';
import { AulaListItem } from './AulaListItem';
import { formatModuleNumber, initialChapterIndex, type ModuleChapterState, type ModulePageData } from './ModulePageModel';

const STATE_CLASS: Record<ModuleChapterState, string> = {
  done: 'is-done', current: 'is-current', progress: 'is-progress', locked: 'is-locked',
};

/** Cards visíveis por vez na faixa de capítulos; acima disso, setas anterior/próxima. */
const VISIBLE_TABS = 5;

function stateLabel(state: ModuleChapterState, fresh: boolean): string {
  if (state === 'done') return 'Concluído';
  if (state === 'locked') return 'Bloqueado';
  return state === 'current' && fresh ? 'Comece aqui' : 'Em andamento';
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** Início da janela que mantém `index` visível, mexendo o mínimo possível. */
function windowFor(index: number, start: number, total: number): number {
  const maxStart = Math.max(0, total - VISIBLE_TABS);
  if (index < start) return clamp(index, 0, maxStart);
  if (index >= start + VISIBLE_TABS) return clamp(index - VISIBLE_TABS + 1, 0, maxStart);
  return clamp(start, 0, maxStart);
}

/** Setas ←/→ (circulares), Home e End do padrão de abas. */
function keyTarget(key: string, index: number, total: number): number | null {
  if (key === 'ArrowRight') return (index + 1) % total;
  if (key === 'ArrowLeft') return (index - 1 + total) % total;
  if (key === 'Home') return 0;
  if (key === 'End') return total - 1;
  return null;
}

interface ModulePageChaptersProps {
  moduloId: number;
  page: ModulePageData;
  onSelectAula: (aulaId: number) => void;
}

/**
 * Capítulos como abas (tablist/tab/tabpanel): só o capítulo escolhido aparece
 * abaixo; começa no capítulo da próxima aula. Com mais de cinco capítulos a
 * faixa mostra cinco por vez e ganha setas anterior/próxima.
 */
export function ModulePageChapters({ moduloId, page, onSelectAula }: ModulePageChaptersProps) {
  const fresh = !page.started;
  const total = page.chapters.length;
  const [picked, setPicked] = useState(() => initialChapterIndex(page));
  const selected = clamp(picked, 0, Math.max(0, total - 1));
  const maxStart = Math.max(0, total - VISIBLE_TABS);
  const [start, setStart] = useState(() => clamp(selected - Math.floor(VISIBLE_TABS / 2), 0, maxStart));
  const first = clamp(start, 0, maxStart);
  const paged = total > VISIBLE_TABS;
  const visible = page.chapters.slice(first, first + VISIBLE_TABS);
  const tabRefs = useRef(new Map<number, HTMLButtonElement>());
  const pendingFocus = useRef<number | null>(null);

  const tabId = (index: number) => `mv-${moduloId}-aba-${index + 1}`;
  const panelId = `mv-${moduloId}-capitulo`;

  useEffect(() => {
    if (pendingFocus.current === null) return;
    tabRefs.current.get(pendingFocus.current)?.focus();
    pendingFocus.current = null;
  }, [selected, first]);

  const select = (index: number, focus = false) => {
    const next = clamp(index, 0, total - 1);
    const visibleNow = next >= first && next < first + VISIBLE_TABS;
    setPicked(next);
    setStart((current) => windowFor(next, current, total));
    if (!focus) return;
    // Já visível: foca agora; senão, foca depois que a janela andar.
    if (visibleNow) tabRefs.current.get(next)?.focus();
    else pendingFocus.current = next;
  };

  const onKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    const target = keyTarget(event.key, index, total);
    if (target === null) return;
    event.preventDefault();
    select(target, true);
  };

  const shift = (direction: -1 | 1) => setStart((current) => clamp(clamp(current, 0, maxStart) + direction * VISIBLE_TABS, 0, maxStart));
  const chapter = page.chapters[selected];
  // Tab da faixa: a aba escolhida ou, se ela saiu da janela, a primeira visível.
  const tabStop = selected >= first && selected < first + VISIBLE_TABS ? selected : first;

  return (
    <section className="mv-chapters" aria-labelledby={`mv-${moduloId}-capitulos-titulo`}>
      <h2 id={`mv-${moduloId}-capitulos-titulo`} className="mv-section-title">
        Os capítulos deste módulo
        <strong>{formatModuleNumber(total)} {total === 1 ? 'parte' : 'partes'}, {formatModuleNumber(page.total)} {page.total === 1 ? 'aula' : 'aulas'}</strong>
      </h2>

      <div className={`mv-cbar${paged ? ' is-paged' : ''}`}>
        {paged && (
          <button type="button" className="mv-cbar-arrow" aria-label="Capítulos anteriores" disabled={first === 0} onClick={() => shift(-1)}>
            <ChevronLeft size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>
        )}
        <div className="mv-tabs" role="tablist" aria-label="Capítulos">
          {visible.map((item, offset) => {
            const index = first + offset;
            const isSelected = index === selected;
            return (
              <button
                key={item.number}
                ref={(node) => { if (node) tabRefs.current.set(index, node); else tabRefs.current.delete(index); }}
                type="button"
                role="tab"
                id={tabId(index)}
                className={`mv-cseg ${STATE_CLASS[item.state]}`}
                aria-selected={isSelected}
                aria-controls={panelId}
                aria-posinset={paged ? index + 1 : undefined}
                aria-setsize={paged ? total : undefined}
                tabIndex={index === tabStop ? 0 : -1}
                onClick={() => select(index)}
                onKeyDown={(event) => onKeyDown(event, index)}
              >
                <small><Folder size={14} strokeWidth={2.6} aria-hidden="true" />Capítulo {item.number}</small>
                <strong>{item.title}</strong>
                <em>{item.done} de {item.total} {item.total === 1 ? 'aula concluída' : 'aulas concluídas'}</em>
                <span className="mv-pbar" aria-hidden="true"><span style={{ width: `${Math.round((item.done / Math.max(item.total, 1)) * 100)}%` }} /></span>
              </button>
            );
          })}
        </div>
        {paged && (
          <button type="button" className="mv-cbar-arrow" aria-label="Próximos capítulos" disabled={first + VISIBLE_TABS >= total} onClick={() => shift(1)}>
            <ChevronRight size={20} strokeWidth={2.8} aria-hidden="true" />
          </button>
        )}
      </div>

      {chapter && (
        <div
          key={chapter.number}
          id={panelId}
          role="tabpanel"
          tabIndex={0}
          aria-labelledby={tabId(selected)}
          className={`mv-chapter ${STATE_CLASS[chapter.state]}`}
        >
          <header className="mv-chapter-head">
            <span className="mv-chapter-icon" aria-hidden="true"><Folder size={22} strokeWidth={2.4} /></span>
            <div className="mv-chapter-title">
              <small>Capítulo {chapter.number} de {total}</small>
              <h3 className="mv-display">{chapter.title}</h3>
            </div>
            <div className="mv-chapter-status">
              <span>{chapter.done} de {chapter.total} {chapter.total === 1 ? 'aula' : 'aulas'}</span>
              <span className={`mv-status ${STATE_CLASS[chapter.state]}`}>{stateLabel(chapter.state, fresh)}</span>
            </div>
          </header>
          <ol className="mv-chapter-body" aria-label={`Aulas do capítulo ${chapter.number}`}>
            {chapter.lessons.map((lesson) => (
              <li key={lesson.aula.id}>
                <AulaListItem aula={lesson.aula} number={lesson.number} isNext={lesson.isNext} fresh={fresh} onSelect={onSelectAula} />
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}
