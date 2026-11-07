import type { CSSProperties } from 'react';
import { ArrowLeft, Check, Folder, Play, SquarePlay, Star } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Pebble } from '@/components/ui/visuals/Pebble';
import { getModuleArtwork } from '@/lib/staticArtwork';
import type { ModuloDetalhes } from '@/services/conteudo';
import { formatModuleNumber, type ModulePageData } from './ModulePageModel';

/** Volta um nível na hierarquia: módulo → mapa do Aprender. */
export function ModuleBackLink({ onBack }: { onBack: () => void }) {
  return (
    <button type="button" className="mv-back" onClick={onBack}>
      <ArrowLeft size={16} strokeWidth={2.6} aria-hidden="true" />
      Voltar para o mapa
    </button>
  );
}

interface ModulePageHeroProps {
  modulo: ModuloDetalhes;
  page: ModulePageData;
  /** Posição na trilha (mesma fonte do mapa); null enquanto a lista não chegou. */
  number: number | null;
  onSelectAula: (aulaId: number) => void;
}

/** Card na cor da escola: identificação, fatos do módulo, progresso e a próxima aula. */
export function ModulePageHero({ modulo, page, number, onSelectAula }: ModulePageHeroProps) {
  const { completed, total } = page;
  const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
  const eyebrow = [number ? `Módulo ${formatModuleNumber(number)}` : 'Módulo', page.levelLabel].filter(Boolean).join(' · ');
  return (
    <section className="mv-hero" aria-labelledby="mv-hero-title">
      <Pebble className="mv-hero-pebble" src={getModuleArtwork(modulo)} state="done" pixelated />
      <div className="mv-hero-copy">
        <p className="mv-eyebrow">{eyebrow}</p>
        <h1 id="mv-hero-title" className="mv-display">{modulo.title}</h1>
        {modulo.description && <p className="mv-hero-desc">{modulo.description}</p>}
        <ul className="mv-facts" aria-label="Sobre o módulo">
          <li className="mv-fact"><Folder size={18} strokeWidth={2.4} aria-hidden="true" /><b>{formatModuleNumber(page.chapters.length)}</b> {page.chapters.length === 1 ? 'capítulo' : 'capítulos'}</li>
          <li className="mv-fact">
            <SquarePlay size={18} strokeWidth={2.4} aria-hidden="true" />
            <b>{formatModuleNumber(total)}</b> {total === 1 ? 'aula' : 'aulas'}{page.typesLabel && ` · ${page.typesLabel}`}
          </li>
          <li className="mv-fact">
            <Star size={18} className="mv-star" strokeWidth={1.6} aria-hidden="true" />
            <b>{formatModuleNumber(modulo.xp_total)} XP</b>{modulo.xp_bonus > 0 && ` + ${formatModuleNumber(modulo.xp_bonus)} de bônus ao concluir`}
          </li>
        </ul>
      </div>
      <div className="mv-hero-side">
        <p className="mv-display mv-count">{formatModuleNumber(completed)}/{formatModuleNumber(total)} <small>{total === 1 ? 'aula' : 'aulas'}</small></p>
        <div
          className="mv-track"
          role="progressbar"
          aria-label="Aulas concluídas no módulo"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-valuetext={`${completed} de ${total} aulas concluídas`}
          style={{ '--mv-steps': Math.max(total, 1) } as CSSProperties}
        >
          <span className="mv-track-fill" style={{ width: `${percent}%` }} />
          <i aria-hidden="true" />
        </div>
        <HeroAction page={page} onSelectAula={onSelectAula} />
      </div>
    </section>
  );
}

function HeroAction({ page, onSelectAula }: Pick<ModulePageHeroProps, 'page' | 'onSelectAula'>) {
  const { next } = page;
  if (next) return (
    <AppButton variant="chunky" tone="yellow" size="md" icon={<Play size={18} fill="currentColor" aria-hidden="true" />} onClick={() => onSelectAula(next.aula.id)}>
      {page.started ? `Continuar aula ${next.number}` : `Começar aula ${next.number}`}
    </AppButton>
  );
  if (page.finished) return <p className="mv-hero-done"><Check size={18} strokeWidth={3} aria-hidden="true" />Módulo concluído</p>;
  return page.total > 0 ? <p className="mv-hero-note">Nenhuma aula liberada agora.</p> : null;
}
