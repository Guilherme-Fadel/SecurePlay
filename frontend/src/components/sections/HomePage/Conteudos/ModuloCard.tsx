import { Check, Lock, Play, Star } from 'lucide-react';
import { Modulo } from '@/services/conteudo';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';
import { getModuleArtwork } from '@/lib/staticArtwork';

interface ModuloCardProps { modulo: Modulo; index?: number; onClick: () => void; }

export function ModuloCard({ modulo, index = 0, onClick }: ModuloCardProps) {
  const isLocked = modulo.locked === true;
  const isCompleted = modulo.progress === 100;
  const isStarted = modulo.hasStarted || modulo.progress > 0;
  const stars = modulo.difficulty === 'iniciante' ? 1 : modulo.difficulty === 'intermediario' ? 2 : 3;
  const stateClass = isLocked ? 'is-locked' : isCompleted ? 'is-complete' : isStarted ? 'is-progress' : 'is-ready';
  return (
    <button
      onClick={isLocked ? undefined : onClick}
      disabled={isLocked}
      aria-disabled={isLocked}
      title={isLocked ? 'Conclua o módulo anterior para desbloquear' : undefined}
      className={`mission-card ${stateClass}`}
    >
      <span className="mission-card-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="mission-card-type">{modulo.type === 'quadrinho' ? 'Quadrinho' : modulo.type === 'video' ? 'Vídeo' : 'Misto'}</span>
      <span className="mission-card-art"><ProgressiveImage src={getModuleArtwork(modulo)} alt="" /></span>
      <span className="mission-card-copy"><strong>{modulo.title}</strong><small>{modulo.completedAulas}/{modulo.totalAulas} aulas · {modulo.xp_total} XP</small></span>
      <span className="mission-card-stars" aria-label={`${stars} estrela(s) de dificuldade`}>{Array.from({ length: 3 }).map((_, starIndex) => <Star key={starIndex} size={16} className={starIndex < stars ? 'is-filled' : ''} />)}</span>
      <span className="mission-card-status">{isLocked ? <><Lock size={15} /> Bloqueada</> : isCompleted ? <><Check size={15} /> Concluída</> : isStarted ? <><Play size={15} /> Continuar</> : 'Começar'}</span>
    </button>
  );
}
