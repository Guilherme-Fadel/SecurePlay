import { Check, Lock, Play, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { Pebble } from '@/components/ui/visuals/Pebble';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { getModuleArtwork, missionRoomAssets } from '@/lib/staticArtwork';
import type { JourneyData } from '@/services/dashboard';
import { formatNumber, nextLessonNumber, type HomeJourney, type HomeJourneyNode } from './homeJourneyModel';
import { bloqueioDaTurma, textoDeBloqueio } from '../Conteudos/lockCopy';

interface HomeHeroProps {
  journey: HomeJourney;
  summary: JourneyData['summary'] | null;
  loading: boolean;
  error: boolean;
  onRetry: () => void;
  onContinue: (node: HomeJourneyNode) => void;
  /** Próxima aula fechada pela turma: revisar a última concluída (ou abrir o módulo). */
  onReview: (node: HomeJourneyNode) => void;
  onPlay?: () => void;
  onOpenLearn: () => void;
}

interface Stop { key: string; label: string; title: string; kind: 'done' | 'now' | 'next' }

/** Card azul do Início: módulo atual, etapa, Antes/Agora/Depois e a ação principal. */
export function HomeHero({ journey, summary, loading, error, onRetry, onContinue, onReview, onPlay, onOpenLearn }: HomeHeroProps) {
  const empty = journey.nodes.length === 0;
  if (loading && empty) return <HeroLoading />;
  if (error && empty) return <HeroError onRetry={onRetry} />;
  const finished = !empty && journey.nodes.every((node) => node.state === 'done');
  if (!journey.current || finished) return <HeroWithoutModule finished={finished} onOpenLearn={onOpenLearn} />;
  return <HeroCurrent journey={journey} current={journey.current} summary={summary} onContinue={onContinue} onReview={onReview} onPlay={onPlay} />;
}

function HeroLoading() {
  return <article className="hv-hero is-loading" aria-busy="true" aria-label="Carregando sua jornada"><span className="hv-skeleton is-title" /><span className="hv-skeleton" /><span className="hv-skeleton is-button" /></article>;
}

function HeroError({ onRetry }: { onRetry: () => void }) {
  return (
    <article className="hv-hero" aria-labelledby="hv-hero-title">
      <div className="hv-hero-copy">
        <h2 id="hv-hero-title" className="hv-display">Sua jornada não carregou</h2>
        <p className="hv-hero-line" role="alert">Não foi possível carregar seus módulos agora.</p>
        <div className="hv-hero-actions">
          <AppButton variant="chunky" tone="yellow" size="md" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
        </div>
      </div>
    </article>
  );
}

function HeroWithoutModule({ finished, onOpenLearn }: { finished: boolean; onOpenLearn: () => void }) {
  const copy = finished
    ? { eyebrow: 'Jornada completa', title: 'Você chegou ao fim da jornada!', line: 'Todos os módulos liberados estão completos. Reveja as aulas quando quiser.', cta: 'Rever módulos' }
    : { eyebrow: 'Aprender', title: 'Sua jornada vai começar', line: 'Os módulos da sua escola aparecem aqui assim que forem liberados.', cta: 'Ir para Aprender' };
  return (
    <article className="hv-hero" aria-labelledby="hv-hero-title">
      <div className="hv-hero-copy">
        <p className="hv-eyebrow">{copy.eyebrow}</p>
        <h2 id="hv-hero-title" className="hv-display">{copy.title}</h2>
        <p className="hv-hero-line">{copy.line}</p>
        <div className="hv-hero-actions">
          <AppButton variant="chunky" tone="yellow" size="big" onClick={onOpenLearn}>{copy.cta}</AppButton>
        </div>
      </div>
      <HeroArt art={missionRoomAssets['icon-flag'] ?? ''} />
    </article>
  );
}

function heroStops(journey: HomeJourney, current: HomeJourneyNode, lesson: number): Stop[] {
  const index = journey.nodes.findIndex((node) => node.id === current.id);
  const previous = index > 0 ? journey.nodes[index - 1] : undefined;
  const next = index >= 0 ? journey.nodes[index + 1] : undefined;
  return [
    { key: 'before', label: 'Antes', title: previous?.title ?? 'Início da jornada', kind: previous ? 'done' : 'next' },
    { key: 'now', label: 'Agora', title: `Aula ${lesson} de ${current.totalAulas}`, kind: 'now' },
    { key: 'after', label: 'Depois', title: next?.title ?? 'Fim da jornada', kind: 'next' },
  ];
}

interface HeroCurrentProps {
  journey: HomeJourney;
  current: HomeJourneyNode;
  summary: JourneyData['summary'] | null;
  onContinue: (node: HomeJourneyNode) => void;
  onReview: (node: HomeJourneyNode) => void;
  onPlay?: () => void;
}

function proximaFechada(current: HomeJourneyNode): string {
  const texto = textoDeBloqueio(current.nextLessonLockReason, current.nextLessonOpensAt);
  return current.nextLessonLockReason === 'scheduled' ? `Próxima aula ${texto.toLowerCase()}` : `Próxima aula: ${texto.toLowerCase()}`;
}

function HeroCurrent({ journey, current, summary, onContinue, onReview, onPlay }: HeroCurrentProps) {
  const total = summary?.totalLessons ?? 0;
  const done = summary?.completedLessons ?? 0;
  const lesson = nextLessonNumber(current);
  const started = current.completedAulas > 0 || current.hasStarted;
  const fechada = bloqueioDaTurma(current.nextLessonLockReason);
  return (
    <article className="hv-hero" aria-labelledby="hv-hero-title">
      <div className="hv-hero-copy">
        {total > 0 && (
          <span className="hv-chip">
            <img src={missionRoomAssets['icon-flag']} alt="" width={30} height={27} />
            Continue sua aventura <span>· {formatNumber(done)} de {formatNumber(total)} aulas feitas</span>
          </span>
        )}
        <p className="hv-eyebrow">{done === 0 ? 'Seu primeiro módulo' : 'Módulo atual'}</p>
        <h2 id="hv-hero-title" className="hv-display">{current.title}</h2>
        <p className="hv-hero-line">Etapa {current.stageIndex + 1} · {current.stageTitle} · aula {lesson} de {current.totalAulas}</p>
        <HeroStops stops={heroStops(journey, current, lesson)} />
        {fechada && <p className="hv-hero-line" role="status">{proximaFechada(current)}</p>}
        <div className="hv-hero-actions">
          {fechada ? <>
            <AppButton variant="chunky" tone="yellow" size="big" icon={<RotateCcw size={20} aria-hidden="true" />} onClick={() => onReview(current)}>
              {current.lastCompletedAulaId ? 'Revisar a última aula' : 'Ver o módulo'}
            </AppButton>
            {onPlay && <AppButton variant="chunky" tone="ghost" size="md" onClick={onPlay}>Jogar</AppButton>}
          </> : <AppButton variant="chunky" tone="yellow" size="big" icon={<Play size={22} fill="currentColor" aria-hidden="true" />} onClick={() => onContinue(current)}>
            {started ? 'Continuar' : 'Começar'} aula {lesson}
          </AppButton>}
          {current.xpBonus > 0 && <span className="hv-bonus">Bônus do módulo <strong>+{formatNumber(current.xpBonus)} XP</strong></span>}
        </div>
      </div>
      <HeroArt art={getModuleArtwork({ title: current.title, artworkUrl: current.artworkUrl, thumbnail: null })} />
    </article>
  );
}

function HeroStops({ stops }: { stops: Stop[] }) {
  return (
    <ol className="hv-stops" aria-label="Seu progresso na jornada">
      {stops.map((stop) => (
        <li key={stop.key} className={`hv-stop is-${stop.kind}`}>
          <i aria-hidden="true">
            {stop.kind === 'done' && <Check size={16} strokeWidth={3.4} />}
            {stop.kind === 'now' && <Play size={14} fill="currentColor" />}
            {stop.key === 'after' && <Lock size={14} strokeWidth={2.6} />}
          </i>
          <span><small>{stop.label}</small><b>{stop.title}</b></span>
        </li>
      ))}
    </ol>
  );
}

function HeroArt({ art }: { art: string }) {
  return (
    <div className="hv-hero-art" aria-hidden="true">
      <Pebble src={art} state="done" pixelated className="hv-hero-pebble" />
      <BrandCharacter className="hv-peek" body="var(--sp-yellow)" face="var(--sp-black)" blink float />
    </div>
  );
}
