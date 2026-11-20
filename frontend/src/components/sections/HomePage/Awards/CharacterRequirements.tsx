import { cn } from '@/lib/utils';
import type { AchievementTrail, UnlockState } from '@/services/achievements';
import { unlockSections, type ConditionLine } from './characterModel';

/** Exigências do item ou do kit: uma por linha, com o progresso e se já foi cumprida. */
export function CharacterRequirements({ unlock, trail, id }: { unlock: UnlockState; trail: Pick<AchievementTrail, 'nodes'> | null; id: string }) {
  const { modeLabel, main, alsoRequired } = unlockSections(unlock, trail);
  if (main.length + alsoRequired.length === 0) return null;
  return (
    <div className="chr-req" role="group" aria-labelledby={id}>
      <strong id={id} className="chr-req-title">Exigências</strong>
      {modeLabel && <small className="chr-req-mode">{modeLabel}</small>}
      <Lines lines={main} />
      {alsoRequired.length > 0 && (
        <>
          <small className="chr-req-mode">e também:</small>
          <Lines lines={alsoRequired} />
        </>
      )}
    </div>
  );
}

function Lines({ lines }: { lines: ConditionLine[] }) {
  if (lines.length === 0) return null;
  return (
    <ul className="chr-req-list">
      {lines.map((entry, index) => (
        <li key={`${index}-${entry.label}`} className={cn('chr-req-line', entry.met && 'is-met')}>
          <span className="chr-req-text"><b>{entry.label}</b><small>{entry.progress}</small></span>
          <span className="chr-req-state">{entry.met ? 'Cumprida' : 'Falta'}</span>
        </li>
      ))}
    </ul>
  );
}
