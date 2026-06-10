import { Modulo } from '@/services/conteudo';
import { ProgressBar } from './ProgressBar';
import { Video, BookOpen, Library, Star } from 'lucide-react';

interface ModuloCardProps {
  modulo: Modulo;
  onClick: () => void;
}

const difficultyConfig = {
  iniciante: { stars: 1, label: 'Recruta' },
  intermediario: { stars: 2, label: 'Agente' },
  avancado: { stars: 3, label: 'Comandante' },
};

const typeConfig = {
  video: { icon: Video, label: 'Vídeo' },
  quadrinho: { icon: BookOpen, label: 'Quadrinho' },
  misto: { icon: Library, label: 'Misto' },
};

export function ModuloCard({ modulo, onClick }: ModuloCardProps) {
  const isCompleted = modulo.progress === 100;
  const TypeIcon = typeConfig[modulo.type].icon;
  const difficulty = difficultyConfig[modulo.difficulty];

  return (
    <div
      onClick={onClick}
      className="cursor-pointer group relative bg-[var(--surface)] border-4 border-[var(--primary)] transition-all hover:border-[var(--accent)] hover:translate-x-[-2px] hover:translate-y-[-2px] hover:shadow-[4px_4px_0_var(--accent)]"
      style={{ boxShadow: '4px 4px 0 var(--primary)' }}
    >
      <div className="h-1 bg-gradient-to-r from-[var(--primary)] via-[var(--secondary)] to-[var(--accent)]" />

      <div className="relative h-40 bg-gradient-to-b from-[#1a0a3e] via-[#2a1a5e] to-[var(--surface)] flex items-center justify-center overflow-hidden">
        {modulo.thumbnail ? (
          <img
            src={modulo.thumbnail}
            alt={modulo.title}
            className="absolute inset-0 w-full h-full object-cover opacity-80"
          />
        ) : (
          <TypeIcon size={48} className="text-[var(--primary)] opacity-80" />
        )}

        <div className="absolute top-2 right-2 px-2 py-0.5 bg-black/70 border border-[var(--border)] text-xs font-[var(--font-family-inter)]">
          <span className={isCompleted ? 'text-[var(--accent)]' : 'text-[var(--text-primary)]'}>
            {modulo.progress}%
          </span>
        </div>

        <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/70 border border-[var(--border)] flex items-center gap-1">
          <TypeIcon size={12} className="text-[var(--text-secondary)]" />
          <span className="text-xs text-[var(--text-secondary)]">{typeConfig[modulo.type].label}</span>
        </div>
      </div>

      <div className="p-4 flex flex-col gap-3">
        <div>
          <h3 className="text-xl text-[var(--text-primary)] leading-tight mb-1">{modulo.title}</h3>
          <p className="text-sm text-[var(--text-secondary)] font-[var(--font-family-inter)] line-clamp-2">
            {modulo.description}
          </p>
        </div>

        <ProgressBar progress={modulo.progress} />

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-1">
            {Array.from({ length: difficulty.stars }).map((_, i) => (
              <Star key={i} size={12} className="text-[var(--accent)] fill-[var(--accent)]" />
            ))}
            <span className="text-[var(--text-secondary)] ml-1 text-xs">{difficulty.label}</span>
          </div>
          <span className="text-[var(--accent)]">
            {modulo.xp_total} XP
          </span>
        </div>

        <div className="flex items-center justify-between text-xs text-[var(--text-secondary)] font-[var(--font-family-inter)]">
          <span>{modulo.category}</span>
          <span>{modulo.completedAulas}/{modulo.totalAulas} fases</span>
        </div>
      </div>
    </div>
  );
}
