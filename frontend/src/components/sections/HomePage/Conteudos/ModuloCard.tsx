import { Modulo } from '@/services/conteudo';
import { ProgressBar } from './ProgressBar';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { ArrowRight, BookOpen, Check, Library, Play, Star, Video } from 'lucide-react';

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
    <button onClick={onClick} className="learning-module-card-wrap group">
      <InfoCard
        variant={isCompleted ? 'accent' : 'primary'}
        raised
        interactive
        className="app-module-card learning-module-card"
      >
        <div className="app-module-cover learning-module-cover">
          {modulo.thumbnail ? (
            <img
              src={modulo.thumbnail}
              alt={modulo.title}
              className="learning-module-image"
            />
          ) : (
            <div className="learning-module-placeholder"><TypeIcon size={34} /></div>
          )}

          <div className="learning-module-type">
            <TypeIcon size={12} className="text-[var(--primary)]" />
            <span>{typeConfig[modulo.type].label}</span>
          </div>

          <div className={`learning-module-state ${isCompleted ? 'is-complete' : ''}`}>
            {isCompleted ? <Check size={12} /> : <span>{modulo.progress}%</span>}
          </div>
        </div>

        <InfoCard.Section className="learning-module-body">
          <div className="learning-module-heading">
            <div>
              <span>{modulo.category}</span>
              <h3>{modulo.title}</h3>
            </div>
            <ArrowRight size={17} />
          </div>

          <p>{modulo.description}</p>

          <ProgressBar progress={modulo.progress} />

          <div className="learning-module-footer">
            <div className="learning-module-difficulty">
              {Array.from({ length: difficulty.stars }).map((_, i) => (
                <Star key={i} size={10} />
              ))}
              <span>{difficulty.label}</span>
            </div>
            <div>
              <span><Play size={10} /> {modulo.completedAulas}/{modulo.totalAulas} fases</span>
              <strong>{modulo.xp_total} XP</strong>
            </div>
          </div>
        </InfoCard.Section>
      </InfoCard>
    </button>
  );
}
