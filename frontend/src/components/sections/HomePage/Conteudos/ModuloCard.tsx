import { Modulo } from '@/services/conteudo';
import { ProgressBar } from './ProgressBar';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Video, BookOpen, Library, Star, Layers } from 'lucide-react';

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
    <div onClick={onClick} className="cursor-pointer group">
      <InfoCard
        variant={isCompleted ? 'accent' : 'primary'}
        raised
        interactive
        className="h-full flex flex-col"
      >
        <div className="relative h-36 bg-gradient-to-br from-[var(--surface-alt)] to-[var(--background)] rounded-t-2xl overflow-hidden flex items-center justify-center">
          {modulo.thumbnail ? (
            <img
              src={modulo.thumbnail}
              alt={modulo.title}
              className="absolute inset-0 w-full h-full object-cover opacity-70"
            />
          ) : (
            <TypeIcon size={40} className="text-[var(--primary)] opacity-60" />
          )}

          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2 py-1 bg-[var(--primary-15)] border border-[var(--primary-30)] backdrop-blur-sm rounded-lg">
            <TypeIcon size={12} className="text-[var(--primary)]" />
            <span className="text-[10px] text-[var(--primary)] font-[var(--font-family-inter)]">
              {typeConfig[modulo.type].label}
            </span>
          </div>

          <div className={`absolute top-3 right-3 px-2 py-1 rounded-lg border backdrop-blur-sm ${
            isCompleted
              ? 'bg-[var(--accent-15)] border-[var(--accent-30)]'
              : 'bg-[var(--primary-15)] border-[var(--primary-30)]'
          }`}>
            <span className={`text-[10px] font-[var(--font-family-inter)] font-semibold ${
              isCompleted ? 'text-[var(--accent-text)]' : 'text-[var(--primary)]'
            }`}>
              {modulo.progress}%
            </span>
          </div>
        </div>

        <InfoCard.Section className="flex-1 flex flex-col gap-3">
          <div>
            <h5 className="text-[var(--text-primary)] leading-tight mb-1">{modulo.title}</h5>
            <p className="text-[var(--text-secondary)] text-xs font-[var(--font-family-inter)] line-clamp-2">
              {modulo.description}
            </p>
          </div>

          <ProgressBar progress={modulo.progress} />

          <div className="flex items-center justify-between mt-auto">
            <div className="flex items-center gap-1">
              {Array.from({ length: difficulty.stars }).map((_, i) => (
                <Star key={i} size={10} className="text-[var(--accent)] fill-[var(--accent)]" />
              ))}
              <span className="text-[var(--text-secondary)] ml-1 text-[10px] font-[var(--font-family-inter)]">
                {difficulty.label}
              </span>
            </div>
            <span className="text-[var(--text-primary)] text-xs font-[var(--font-family-inter)] font-semibold">
              {modulo.xp_total} XP
            </span>
          </div>

          <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)] font-[var(--font-family-inter)]">
            <span>{modulo.category}</span>
            <div className="flex items-center gap-1">
              <Layers size={10} />
              <span>{modulo.completedAulas}/{modulo.totalAulas} fases</span>
            </div>
          </div>
        </InfoCard.Section>
      </InfoCard>
    </div>
  );
}
