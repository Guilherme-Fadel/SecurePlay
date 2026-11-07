import { ContentLoading } from '@/components/shared/ContentLoading';
import { Check, Lock, Play } from 'lucide-react';
import type { AulaResumo, ModuloDetalhes } from '@/services/conteudo';
import { formatXp, lessonPosition } from './lessonContext';

interface LessonNavigatorProps {
  modulo: ModuloDetalhes | null;
  activeAulaId: number;
  onSelectAula: (aulaId: number) => void;
}

type Slot = 'previous' | 'current' | 'next';

const SLOT_LABEL: Record<Slot, string> = { previous: 'Anterior', current: 'Nesta aula', next: 'Próxima' };

function LessonRow({ aula, number, slot, onSelect }: { aula: AulaResumo; number: number; slot: Slot; onSelect: (id: number) => void }) {
  const done = aula.status === 'completed';
  const locked = aula.status === 'locked';
  const state = slot === 'current' ? 'is-current' : done ? 'is-done' : locked ? 'is-locked' : 'is-open';
  const detail = slot === 'current' ? `Aula ${number} · agora` : `Aula ${number} · ${done ? 'concluída' : locked ? 'bloqueada' : `${formatXp(aula.xp)} XP`}`;
  const icon = slot === 'current' ? <Play size={14} fill="currentColor" />
    : done ? <Check size={18} strokeWidth={3.4} />
      : locked ? <Lock size={14} strokeWidth={2.8} /> : number;
  const body = (
    <>
      <i aria-hidden="true">{icon}</i>
      <span><small className="lesson-sr">{SLOT_LABEL[slot]}: </small><strong>{aula.title}</strong><small>{detail}</small></span>
    </>
  );
  return (
    <li className={`lesson-mini ${state}`}>
      {slot === 'current' || locked
        ? <div className="lesson-mini-row" aria-current={slot === 'current' ? 'step' : undefined}>{body}</div>
        : <button type="button" className="lesson-mini-row" onClick={() => onSelect(aula.id)}>{body}</button>}
    </li>
  );
}

/** Aside "Aulas do módulo": anterior, atual e próxima na sequência do módulo. */
export function LessonNavigator({ modulo, activeAulaId, onSelectAula }: LessonNavigatorProps) {
  if (!modulo) return <ContentLoading variant="trail" />;
  const position = lessonPosition(modulo, activeAulaId);
  const number = position.number ?? 0;
  const rows: Array<{ aula: AulaResumo | null; slot: Slot; number: number }> = [
    { aula: position.previous, slot: 'previous', number: number - 1 },
    { aula: position.current, slot: 'current', number },
    { aula: position.next, slot: 'next', number: number + 1 },
  ];
  const chapter = position.current?.section_name?.trim();

  return (
    <section className="lesson-box">
      <h2 className="lesson-display">Aulas do módulo</h2>
      <p>{chapter ? `${modulo.title} · ${chapter}` : modulo.title}</p>
      <ol className="lesson-mini-list">
        {rows.map(({ aula, slot, number: rowNumber }) => aula
          ? <LessonRow key={aula.id} aula={aula} number={rowNumber} slot={slot} onSelect={onSelectAula} />
          : null)}
      </ol>
      <p className="lesson-box-count">
        {modulo.progress === 100 ? 'Módulo concluído' : `${modulo.completedAulas} de ${modulo.totalAulas} aulas concluídas`}
      </p>
    </section>
  );
}
