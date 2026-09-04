import { AulaResumo } from '@/services/conteudo';
import { ArrowRight, BookOpen, Check, Clock3, Lock, Play, Video } from 'lucide-react';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';

interface AulaListItemProps {
  aula: AulaResumo;
  onClick: () => void;
  index?: number;
  active?: boolean;
  artSrc?: string;
}

const statusConfig = {
  completed: { Icon: Check, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/20', border: 'border-[var(--accent)]/30' },
  unlocked: { Icon: Play, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/20', border: 'border-[var(--primary)]/30' },
  locked: { Icon: Lock, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-alt)]', border: 'border-[var(--border)]' },
};

export function AulaListItem({ aula, onClick, index = 0, active = false, artSrc }: AulaListItemProps) {
  const config = statusConfig[aula.status];
  const isLocked = aula.status === 'locked';
  const TypeIcon = aula.type === 'video' ? Video : BookOpen;

  return (
    <button
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      className={`learning-lesson-row ${config.border} ${isLocked ? 'is-locked' : ''} ${active ? 'is-active' : ''}`}
    >
      <div className="learning-lesson-index">{String(index + 1).padStart(2, '0')}</div>
      <div className={`learning-lesson-status ${config.bg}`}>
        {artSrc ? <ProgressiveImage src={artSrc} alt="" /> : <config.Icon size={16} className={config.color} />}
      </div>

      <div className="learning-lesson-copy">
        <div><TypeIcon size={12} /><span>{aula.type === 'video' ? 'Vídeo' : 'Quadrinho'}</span></div>
        <h3>{aula.title}</h3>
        {aula.description && (
          <p>{aula.description}</p>
        )}
      </div>

      <div className="learning-lesson-meta">
        <span><Clock3 size={11} /> {aula.type === 'video' ? `${aula.duration} min` : `${aula.page_count ?? aula.duration} pág`}</span>
        <strong>{aula.xp} XP</strong>
        {!isLocked && <ArrowRight size={15} />}
      </div>
    </button>
  );
}
