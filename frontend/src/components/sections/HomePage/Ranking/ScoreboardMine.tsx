import { useId } from 'react';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { turmaChip, type BoardEntry } from './boardModel';
import { avatarTone } from './rankingAvatarTone';
import type { MineBar } from './mineModel';

interface ScoreboardMineProps {
  mine: MineBar;
  onSelect: (id: string) => void;
  onContinue: () => void;
}

/** O personagem do aluno (visual equipado) ou o chip com as iniciais da turma. */
function MineLead({ entry }: { entry: BoardEntry }) {
  const tone = avatarTone(entry.rankKey, false);
  if (entry.kind === 'turma') return <span className="sb-tchip" style={{ background: tone.background, color: tone.color }} aria-hidden="true">{turmaChip(entry.name)}</span>;
  return <span className="sb-mine-pet" aria-hidden="true"><CharacterAvatar look={entry.look ?? {}} color={tone.background} variant="compact" /></span>;
}

function MineActions({ mine, onSelect, onContinue }: ScoreboardMineProps) {
  const { id, onStage } = mine;
  return (
    <div className="sb-mine-act">
      {id && (
        <AppButton variant="chunky" tone="ghost" size="sm" aria-disabled={onStage || undefined} onClick={() => { if (!onStage) onSelect(id); }}>
          {onStage ? 'No palco' : 'Ver no palco'}
        </AppButton>
      )}
      {mine.cta && <AppButton variant="chunky" tone="blue" size="sm" onClick={onContinue}>Continuar a trilha</AppButton>}
    </div>
  );
}

/** Faixa de baixo (canvas `hf-mine`): sua posição (ou turma, ou a visão de gestão), o texto de quanto falta e as ações. */
export function ScoreboardMine({ mine, onSelect, onContinue }: ScoreboardMineProps) {
  const titleId = useId();
  return (
    <section className={`sb-mine${mine.variant === 'manage' ? ' is-manage' : ''}`} aria-labelledby={titleId}>
      <div className="sb-mine-pos">
        <small id={titleId}>{mine.label}</small>
        <b className="rk-display">{mine.position}</b>
      </div>
      {mine.entry && <MineLead entry={mine.entry} />}
      <p className="sb-mine-text">{mine.text}</p>
      {(mine.id || mine.cta) && <MineActions mine={mine} onSelect={onSelect} onContinue={onContinue} />}
    </section>
  );
}
