import { ArrowRight } from 'lucide-react';
import { Pebble } from '@/components/ui/visuals/Pebble';
import { getModuleArtwork } from '@/lib/staticArtwork';
import { formatNumber, moduleCta, typeLabel, type LearnModule } from './learnMapModel';

interface ModuloCardProps {
  item: LearnModule;
  onOpen: (moduloId: number) => void;
}

function progressLine(item: LearnModule): string {
  const { completedAulas, totalAulas } = item.modulo;
  const lessons = `${totalAulas} ${totalAulas === 1 ? 'aula' : 'aulas'}`;
  if (item.state === 'locked') return `${lessons} · conclua o módulo anterior para liberar`;
  return `${completedAulas} de ${lessons} concluídas`;
}

/** Linha de módulo no painel do território: arte, tipo, XP, progresso e ação. */
export function ModuloCard({ item, onOpen }: ModuloCardProps) {
  const { modulo } = item;
  const type = typeLabel(modulo.type);
  const xp = formatNumber(modulo.xp_total + modulo.xp_bonus);
  const head = (
    <>
      <Pebble src={getModuleArtwork(modulo)} state={item.state} pixelated className="lv-mod-art" />
      <span className="lv-mod-copy">
        <span className="lv-mod-meta">
          <span className="lv-mod-num">Módulo {item.number}</span>
          <span className={`lv-chip is-${modulo.type}`}>{type}</span>
          <span className="lv-xp">{xp} XP</span>
        </span>
        <strong>{modulo.title}</strong>
        <small>{progressLine(item)}</small>
      </span>
    </>
  );

  if (item.state === 'locked') {
    return (
      <div className="lv-mod is-locked">
        {head}
        <span className="lv-sr">Bloqueado.</span>
      </div>
    );
  }

  const cta = moduleCta(item);
  return (
    <button
      type="button"
      className={`lv-mod is-${item.state}`}
      aria-current={item.state === 'here' ? 'step' : undefined}
      onClick={() => onOpen(modulo.id)}
    >
      {head}
      {item.state === 'here' && <span className="lv-sr">Você está aqui.</span>}
      <span className="lv-mod-go"><span className="lv-mod-go-text">{cta}</span><ArrowRight size={18} strokeWidth={2.6} aria-hidden="true" /></span>
    </button>
  );
}
