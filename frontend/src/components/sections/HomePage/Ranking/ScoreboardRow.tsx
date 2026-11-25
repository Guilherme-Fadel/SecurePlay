import type { CSSProperties } from 'react';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import type { RankingCategory, RankingEntry } from '@/services/dashboard';
import { rowSub, rowTrend, toBoardEntry, turmaChip, valueParts, type BoardEntry } from './boardModel';
import { pedestalTier } from './hallModel';
import { avatarTone } from './rankingAvatarTone';
import { ordinal } from './rankingModel';
import { scoreboardRowLabel, scoreboardRowTheme } from './scoreboardModel';

interface ScoreboardRowProps {
  entry: RankingEntry;
  category: RankingCategory;
  me: boolean;
  onStage: boolean;
  /** Classificação global: mostra a instituição abaixo do nome. */
  showCompany: boolean;
  onSelect: (id: string) => void;
}

/** O mini personagem do aluno (visual equipado) ou o chip com as iniciais da turma. */
function RowLead({ entry }: { entry: BoardEntry }) {
  const tone = avatarTone(entry.rankKey, false);
  if (entry.kind === 'turma') return <span className="sb-tchip" style={{ background: tone.background, color: tone.color }} aria-hidden="true">{turmaChip(entry.name)}</span>;
  return <span className="sb-pet" aria-hidden="true"><CharacterAvatar look={entry.look ?? {}} color={tone.background} variant="compact" /></span>;
}

/** Valor da categoria com a unidade e, embaixo, a tendência da semana (ou "total da turma"). */
function RowValue({ category, entry }: { category: RankingCategory; entry: BoardEntry }) {
  const parts = valueParts(category, entry.value);
  const trend = rowTrend(entry);
  return (
    <span className="sb-val" aria-hidden="true">
      {parts.number} <small>{parts.unit}</small>
      {trend && <small className={`sb-trend is-${trend.tone}`}>{trend.text}</small>}
    </span>
  );
}

/** Segunda linha do nome: as marcas "No palco" e "Você" e o subtítulo; sem nenhum dos três, não existe. */
function RowMeta({ onStage, you, sub }: { onStage: boolean; you: boolean; sub: string | null }) {
  if (!onStage && !you && !sub) return null;
  return (
    <span className="sb-meta">
      {onStage && <em className="sb-tag">No palco</em>}
      {you && <em className="sb-tag is-me">Você</em>}
      {sub && <small title={sub}>{sub}</small>}
    </span>
  );
}

/**
 * Uma linha do placar (canvas `hf-row`): posição, o personagem compacto (ou o chip da turma), nome com
 * as marcas "No palco"/"Você", nível, valor da categoria com a tendência da semana e o tema do card.
 */
export function ScoreboardRow({ entry, category, me, onStage, showCompany, onSelect }: ScoreboardRowProps) {
  const row = toBoardEntry(entry);
  const turma = row.kind === 'turma';
  const theme = scoreboardRowTheme(row);
  const sub = rowSub(row, showCompany, me);
  const classes = ['sb-row', theme?.className, theme ? 'is-themed' : '', onStage ? 'is-on' : '', me ? 'is-me' : ''].filter(Boolean).join(' ');
  return (
    <li>
      <button
        type="button"
        className={classes}
        style={theme?.style as CSSProperties | undefined}
        aria-current={onStage ? 'true' : undefined}
        aria-label={scoreboardRowLabel(row, { me, onStage, showCompany, category })}
        onClick={() => onSelect(row.rankKey)}
      >
        <span className={`sb-pos is-${pedestalTier(row.position)}`} aria-hidden="true">{ordinal(row.position)}</span>
        <RowLead entry={row} />
        <span className="sb-who" aria-hidden="true">
          <strong title={row.name}>{row.name}</strong>
          <RowMeta onStage={onStage} you={me && !turma} sub={sub} />
        </span>
        <span className="sb-lv" aria-hidden="true">{turma ? '' : `Nv ${row.level}`}</span>
        <RowValue category={category} entry={row} />
      </button>
    </li>
  );
}
