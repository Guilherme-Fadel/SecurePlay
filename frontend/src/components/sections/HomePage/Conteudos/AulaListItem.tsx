import { AulaResumo } from '@/services/conteudo';
import { Video, BookOpen, Check, Play, Lock } from 'lucide-react';

interface AulaListItemProps {
  aula: AulaResumo;
  onClick: () => void;
}

const statusConfig = {
  completed: { Icon: Check, color: 'text-[var(--accent)]', bg: 'bg-[var(--accent)]/20', border: 'border-[var(--accent)]/30' },
  unlocked: { Icon: Play, color: 'text-[var(--primary)]', bg: 'bg-[var(--primary)]/20', border: 'border-[var(--primary)]/30' },
  locked: { Icon: Lock, color: 'text-[var(--text-secondary)]', bg: 'bg-[var(--surface-alt)]', border: 'border-[var(--border)]' },
};

export function AulaListItem({ aula, onClick }: AulaListItemProps) {
  const config = statusConfig[aula.status];
  const isLocked = aula.status === 'locked';
  const TypeIcon = aula.type === 'video' ? Video : BookOpen;

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${config.border} ${
        isLocked
          ? 'opacity-50 cursor-not-allowed'
          : 'cursor-pointer hover:bg-[var(--surface-alt)] hover:scale-[1.01]'
      }`}
    >
      <div className={`w-9 h-9 rounded-xl ${config.bg} flex items-center justify-center flex-shrink-0`}>
        <config.Icon size={16} className={config.color} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TypeIcon size={12} className="text-[var(--text-secondary)] flex-shrink-0" />
          <h5 className={`truncate leading-tight ${isLocked ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
            {aula.title}
          </h5>
        </div>
        {aula.description && (
          <p className="text-[10px] text-[var(--text-secondary)] font-[var(--font-family-inter)] truncate mt-0.5">
            {aula.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-2 text-[10px] text-[var(--text-secondary)] font-[var(--font-family-inter)] flex-shrink-0">
        <span>{aula.duration}{aula.type === 'video' ? ' min' : ' pág'}</span>
        <span className={config.color}>{aula.xp} XP</span>
      </div>
    </div>
  );
}
