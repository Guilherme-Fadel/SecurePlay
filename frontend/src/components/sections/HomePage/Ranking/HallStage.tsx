import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import '@/styles/character-fitting.css';
import type { RankingCategory, RankingData, RankingEntry, RankingMode, RankingUnit } from '@/services/dashboard';
import { bodyColorOrFallback } from '@/components/shared/Character/characterColor';
import { avatarTone } from './rankingAvatarTone';
import { HallActor } from './HallActor';
import { HallCastLayer } from './HallCast';
import {
  hallAnnouncement, hallPokeLabel, hallScopeText, hallStageClass, hallTheme, hallTrio, isHallMe, selectedEntry,
} from './hallModel';
import { useHallSteps } from './useHallSteps';

export interface HallStageProps {
  /** Quem pode subir ao palco, na ordem da classificação (top 50 e, abaixo dele, o próprio aluno). */
  entries: RankingEntry[];
  /** Em destaque; `null` ou um id fora da lista mostram o 1º colocado. */
  selectedId: string | null;
  /** Pedido de troca de destaque (setas, teclado e o placar). */
  onSelect: (id: string) => void;
  /** Chave do aluno logado quando ele participa; gestão passa `null`. */
  viewerKey: string | null;
  scope: RankingData['scope'];
  mode: RankingMode;
  /** Categoria em destaque na placa e unidade do placar (alunos ou turmas). */
  category: RankingCategory;
  unit: RankingUnit;
  /** Nome da temporada, escrito na aba do alto do palco. */
  seasonLabel: string;
  showCompany: boolean;
  /** Uma classificação nova carrega: o palco avisa "Trocando o placar…" até o resultado chegar. */
  pending: boolean;
}

/**
 * Palco do Hall da Fama: o personagem montável do aluno sobre o fundo equipado, o selo de posição
 * (colorido pelo pódio), as setas, uma placa no tema do card dele (ou, nas turmas, o trio padrão e
 * os totais) e o nome da temporada. Trocar o aluno em destaque só faz o personagem pular para o
 * palco; enquanto um filtro novo carrega, a pílula "Trocando o placar…" aparece sobre o palco.
 */
export function HallStage(props: HallStageProps) {
  const { entries, selectedId, onSelect, viewerKey, scope, mode, category, unit, seasonLabel, showCompany, pending } = props;
  const uid = `hall${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const reduceMotion = useReducedMotion() === true;
  const entry = selectedEntry(entries, selectedId);
  const { prev, next, onKeyDown } = useHallSteps(entries, entry?.rankKey ?? null, true, onSelect);
  if (!entry) return null;

  const me = isHallMe(entry, viewerKey);
  const theme = hallTheme(entry.look);
  return (
    <section className="hall" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-hint`} tabIndex={0} onKeyDown={onKeyDown}>
      <h2 id={`${uid}-title`} className="rk-sr">Hall da Fama</h2>
      <p id={`${uid}-hint`} className="rk-sr">Use as setas esquerda e direita do teclado para trocar o aluno em destaque.</p>
      <div className={hallStageClass(entry.position, theme)} style={theme.stage.style}>
        <HallActor
          entryId={entry.rankKey}
          look={entry.look ?? {}}
          color={bodyColorOrFallback(entry.look, avatarTone(entry.rankKey, false).background)}
          pokeLabel={hallPokeLabel(entry, me)}
          reduceMotion={reduceMotion}
          trio={hallTrio(entry)}
        />
        <p className="hall-season rk-display" aria-hidden="true">{seasonLabel}</p>
        <p className="hall-wait" role="status">{pending ? 'Trocando o placar…' : ''}</p>
        <HallCastLayer
          entry={entry}
          me={me}
          theme={theme}
          scope={scope}
          mode={mode}
          category={category}
          unit={unit}
          showCompany={showCompany}
          prev={prev}
          next={next}
        />
      </div>
      <p className="rk-sr" role="status">{hallAnnouncement(entry, me, hallScopeText(scope, unit), category)}</p>
    </section>
  );
}
