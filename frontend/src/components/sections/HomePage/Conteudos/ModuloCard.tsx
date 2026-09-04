import { Check, Play, Star } from 'lucide-react';
import { Modulo } from '@/services/conteudo';
import type { MissionRoomAssets } from '@/hooks/useMissionRoomAssets';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';

interface ModuloCardProps { modulo: Modulo; assets: MissionRoomAssets; index?: number; onClick: () => void; }
const fallbackKeys = ['module-foundations','module-passwords','module-authentication','module-privacy','module-phishing','module-navigation'];

function getModuleIcon(modulo: Modulo, index: number, assets: MissionRoomAssets) {
  const text = `${modulo.title} ${modulo.category}`.toLocaleLowerCase('pt-BR');
  let key = fallbackKeys[index % fallbackKeys.length];
  if (text.includes('fundamento')) key = 'module-foundations';
  else if (text.includes('senha') && !text.includes('autent')) key = 'module-passwords';
  else if (text.includes('autent') || text.includes('mfa')) key = 'module-authentication';
  else if (text.includes('privacidade') || text.includes('dados')) key = 'module-privacy';
  else if (text.includes('golpe') || text.includes('phishing') || text.includes('link')) key = 'module-phishing';
  else if (text.includes('navega') || text.includes('internet')) key = 'module-navigation';
  return assets[key];
}

export function ModuloCard({ modulo, assets, index = 0, onClick }: ModuloCardProps) {
  const isCompleted = modulo.progress === 100;
  const isStarted = modulo.hasStarted || modulo.progress > 0;
  const stars = modulo.difficulty === 'iniciante' ? 1 : modulo.difficulty === 'intermediario' ? 2 : 3;
  return (
    <button onClick={onClick} className={`mission-card ${isCompleted ? 'is-complete' : isStarted ? 'is-progress' : 'is-ready'}`}>
      <span className="mission-card-number">{String(index + 1).padStart(2, '0')}</span>
      <span className="mission-card-type">{modulo.type === 'quadrinho' ? 'Quadrinho' : modulo.type === 'video' ? 'Vídeo' : 'Misto'}</span>
      <span className="mission-card-art"><ProgressiveImage src={getModuleIcon(modulo, index, assets)} alt="" /></span>
      <span className="mission-card-copy"><strong>{modulo.title}</strong><small>{modulo.completedAulas}/{modulo.totalAulas} aulas · {modulo.xp_total} XP</small></span>
      <span className="mission-card-stars" aria-label={`${stars} estrela(s) de dificuldade`}>{Array.from({ length: 3 }).map((_, starIndex) => <Star key={starIndex} size={16} className={starIndex < stars ? 'is-filled' : ''} />)}</span>
      <span className="mission-card-status">{isCompleted ? <><Check size={15} /> Concluída</> : isStarted ? <><Play size={15} /> Continuar</> : 'Começar'}</span>
    </button>
  );
}
