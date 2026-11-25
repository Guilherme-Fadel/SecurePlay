import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CardFrame } from '@/components/shared/Character/CardFrame';
import type { RankingCategory, RankingData, RankingEntry, RankingMode, RankingUnit } from '@/services/dashboard';
import { stageStats, toBoardEntry } from './boardModel';
import { hallBadge, hallPill, type HallTheme } from './hallModel';
import type { HallStep } from './useHallSteps';

interface HallBadgeProps { number: string; caption: string }

/** "1º lugar" em letras grandes no canto do palco; a placa e o aviso do leitor de tela já dizem o mesmo. */
export function HallBadge({ number, caption }: HallBadgeProps) {
  return (
    <div className="hall-badge" aria-hidden="true">
      <b className="rk-display">{number}</b>
      <b className="rk-display is-word">lugar</b>
      <small>{caption}</small>
    </div>
  );
}

interface HallNavProps {
  direction: -1 | 1;
  label: string;
  enabled: boolean;
  onStep: () => void;
}

/** Seta só com ícone; no limite da lista fica `aria-disabled` (não perde o foco do teclado). */
export function HallNav({ direction, label, enabled, onStep }: HallNavProps) {
  const Icon = direction < 0 ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      className={`hall-nav ${direction < 0 ? 'is-prev' : 'is-next'}`}
      aria-label={label}
      aria-disabled={enabled ? undefined : true}
      onClick={() => { if (enabled) onStep(); }}
    >
      <Icon size={22} strokeWidth={3} aria-hidden="true" />
    </button>
  );
}

interface HallPlateProps {
  entry: RankingEntry;
  className: string;
  style: { backgroundColor?: string; backgroundImage?: string } | undefined;
  frameUrl: string | null;
  pill: string;
  mode: RankingMode;
  category: RankingCategory;
}

/** Placa com o tema do card do aluno (`look.card`): nome, nível ou escola e as três estatísticas do período (a da categoria em destaque). */
export function HallPlate({ entry, className, style, frameUrl, pill, mode, category }: HallPlateProps) {
  return (
    <div className={`hall-plate ${className}`} style={style}>
      <div className="hall-plate-head">
        <strong className="rk-display" title={entry.name}>{entry.name}</strong>
        <span className="hall-pill">{pill}</span>
      </div>
      <dl className="hall-stats">
        {stageStats(toBoardEntry(entry), mode, category).map((stat) => (
          <div key={stat.key} className={stat.on ? 'hall-stat is-on' : 'hall-stat'}><dt><span className="is-long">{stat.label}</span><span className="is-short">{stat.short}</span></dt><dd>{stat.text}</dd></div>
        ))}
      </dl>
      <CardFrame artUrl={frameUrl} />
    </div>
  );
}

interface HallCastLayerProps {
  entering: boolean;
  entry: RankingEntry;
  me: boolean;
  theme: HallTheme;
  scope: RankingData['scope'];
  mode: RankingMode;
  category: RankingCategory;
  unit: RankingUnit;
  showCompany: boolean;
  prev: HallStep;
  next: HallStep;
  /** A cortina ainda não terminou de abrir (ou já fechou): nada daqui recebe foco nem toque. */
  covered: boolean;
}

/**
 * Atributo `inert` (o React 18 não o tipa): tira do foco, do toque e do leitor de tela o que a cortina cobre.
 * No React 19 ele vira prop booleana (`inert={covered}`) e este objeto deixa de ser necessário.
 */
export const INERT_PROPS: Record<string, string> = { inert: '' };

/** Tudo o que sobe ao palco com a cortina aberta: selo, "Você", setas e a placa do aluno. */
export function HallCastLayer({ entering, entry, me, theme, scope, mode, category, unit, showCompany, prev, next, covered }: HallCastLayerProps) {
  const badge = hallBadge(entry.position, scope, mode, unit);
  return (
    <div className={`hall-cast${entering ? ' is-entering' : ''}`} {...(covered ? INERT_PROPS : {})}>
      <HallBadge number={badge.number} caption={badge.caption} />
      {me && <span className="hall-me">{toBoardEntry(entry).kind === 'turma' ? 'Sua turma' : 'Você'}</span>}
      <HallNav direction={-1} label={prev.label} enabled={prev.enabled} onStep={prev.go} />
      <HallNav direction={1} label={next.label} enabled={next.enabled} onStep={next.go} />
      <HallPlate
        entry={entry}
        className={theme.card.className}
        style={theme.card.style}
        frameUrl={theme.card.frameUrl}
        pill={hallPill(entry, showCompany)}
        mode={mode}
        category={category}
      />
    </div>
  );
}
