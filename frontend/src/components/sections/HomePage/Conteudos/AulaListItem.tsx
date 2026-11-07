import type { ReactNode } from 'react';
import { BookOpenText, Check, Lock, PanelsTopLeft, SquarePlay } from 'lucide-react';
import type { AulaResumo } from '@/services/conteudo';
import { LESSON_TYPE_LABEL, formatModuleNumber } from './ModulePageModel';

interface AulaListItemProps {
  aula: AulaResumo;
  /** Posição 1-based na sequência do módulo. */
  number: number;
  /** Próxima aula liberada pelo backend ("Você está aqui"). */
  isNext: boolean;
  /** Ainda sem progresso no módulo: o marcador vira "Comece aqui". */
  fresh: boolean;
  onSelect: (aulaId: number) => void;
}

const TYPE_ICON: Record<AulaResumo['type'], ReactNode> = {
  video: <SquarePlay size={14} strokeWidth={2.4} aria-hidden="true" />,
  quadrinho: <PanelsTopLeft size={14} strokeWidth={2.4} aria-hidden="true" />,
  texto: <BookOpenText size={14} strokeWidth={2.4} aria-hidden="true" />,
};

const STATUS_LABEL: Record<AulaResumo['status'], string> = {
  completed: 'Concluída',
  unlocked: 'Disponível',
  locked: 'Bloqueada',
};

/** Linha de aula do módulo. Status e bloqueio vêm do backend; aula bloqueada não é interativa. */
export function AulaListItem({ aula, number, isNext, fresh, onSelect }: AulaListItemProps) {
  const locked = aula.status === 'locked';
  const kind = aula.status === 'completed' ? 'is-done' : isNext ? 'is-current' : locked ? 'is-locked' : 'is-open';
  const content = (
    <>
      <span className="mv-dot" aria-hidden="true">
        {aula.status === 'completed' ? <Check size={22} strokeWidth={3} /> : locked ? <Lock size={18} strokeWidth={2.4} /> : number}
      </span>
      <span className="mv-row-copy">
        <span className="mv-row-meta">
          <span>Aula {number}</span>
          <span className="mv-type">{TYPE_ICON[aula.type]}{LESSON_TYPE_LABEL[aula.type]}</span>
          {aula.duration > 0 && <span>{formatModuleNumber(aula.duration)} min</span>}
        </span>
        <strong className="mv-row-title">{aula.title}</strong>
        {aula.description && <small className="mv-row-desc">{aula.description}</small>}
        {locked && <small className="mv-row-lock">Conclua as aulas anteriores para liberar esta aula.</small>}
      </span>
      <span className="mv-row-side">
        {isNext && <span className="mv-here">{fresh ? 'Comece aqui' : 'Você está aqui'}</span>}
        <span className="mv-xp">{formatModuleNumber(aula.xp)} XP</span>
        <span className="mv-sr">{STATUS_LABEL[aula.status]}</span>
      </span>
    </>
  );

  if (locked) return <div className={`mv-row ${kind}`}>{content}</div>;
  return (
    <button type="button" className={`mv-row ${kind}`} onClick={() => onSelect(aula.id)}>
      {content}
    </button>
  );
}
