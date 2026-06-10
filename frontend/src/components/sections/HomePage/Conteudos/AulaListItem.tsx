import { AulaResumo } from '@/services/conteudo';
import { Video, BookOpen, Check, Play, Lock } from 'lucide-react';

interface AulaListItemProps {
  aula: AulaResumo;
  onClick: () => void;
}

const statusConfig = {
  completed: { Icon: Check, color: 'text-[var(--accent)]', border: 'border-[var(--accent)]', bg: 'bg-[var(--accent)]' },
  unlocked: { Icon: Play, color: 'text-[var(--primary)]', border: 'border-[var(--primary)]', bg: 'bg-[var(--primary)]' },
  locked: { Icon: Lock, color: 'text-[var(--text-secondary)]', border: 'border-[var(--border)]', bg: 'bg-[var(--surface-alt)]' },
};

export function AulaListItem({ aula, onClick }: AulaListItemProps) {
  const config = statusConfig[aula.status];
  const isLocked = aula.status === 'locked';
  const TypeIcon = aula.type === 'video' ? Video : BookOpen;

  return (
    <div
      onClick={isLocked ? undefined : onClick}
      className={`flex items-center gap-4 p-4 border-2 transition-all ${
        isLocked
          ? 'border-[var(--border)] opacity-50 cursor-not-allowed'
          : `${config.border} cursor-pointer hover:translate-x-[-1px] hover:translate-y-[-1px] hover:shadow-[3px_3px_0_var(--primary)]`
      }`}
      style={!isLocked ? { boxShadow: '2px 2px 0 var(--border)' } : undefined}
    >
      <div className={`w-10 h-10 rounded-full ${config.bg} border-2 ${config.border} flex items-center justify-center flex-shrink-0`}>
        <config.Icon size={16} className={aula.status === 'completed' ? 'text-[var(--background)]' : 'text-white'} />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <TypeIcon size={14} className="text-[var(--text-secondary)] flex-shrink-0" />
          <h4 className={`text-lg truncate ${isLocked ? 'text-[var(--text-secondary)]' : 'text-[var(--text-primary)]'}`}>
            {aula.title}
          </h4>
        </div>
        {aula.description && (
          <p className="text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)] truncate mt-0.5">
            {aula.description}
          </p>
        )}
      </div>

      <div className="flex items-center gap-3 text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)] flex-shrink-0">
        <span>{aula.duration}{aula.type === 'video' ? ' min' : ' pág'}</span>
        <span className={config.color}>{aula.xp} XP</span>
      </div>
    </div>
  );
}
