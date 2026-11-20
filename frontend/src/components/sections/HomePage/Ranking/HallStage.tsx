import { useId } from 'react';
import { useReducedMotion } from 'motion/react';
import '@/styles/character-fitting.css';
import type { RankingCategory, RankingData, RankingEntry, RankingMode, RankingUnit } from '@/services/dashboard';
import { avatarTone } from './rankingAvatarTone';
import { HallActor } from './HallActor';
import { HallCastLayer } from './HallCast';
import { HallConfetti } from './HallConfetti';
import { HallCurtain } from './HallCurtain';
import { HallScene } from './HallScene';
import { HallValance } from './HallValance';
import {
  celebrates, hallAnnouncement, hallPokeLabel, hallScopeText, hallStageClass, hallTheme, hallTrio, isHallMe, selectedEntry, stageFlags,
} from './hallModel';
import { waitNotice } from './curtainFlow';
import { useHallCurtain } from './useHallCurtain';
import { useHallSteps } from './useHallSteps';
import { useHallView } from './useHallView';

export interface HallStageProps {
  /** Quem pode subir ao palco, na ordem da classificação (top 50 e, abaixo dele, o próprio aluno). */
  entries: RankingEntry[];
  /** Em destaque; `null` ou um id fora da lista mostram o 1º colocado. */
  selectedId: string | null;
  /** Pedido de troca de destaque (setas, teclado e o placar). */
  onSelect: (id: string) => void;
  /** Muda com escopo, período e temporada: a cortina fecha e reabre. */
  sceneKey: string;
  /** Chave do aluno logado quando ele participa; gestão passa `null`. */
  viewerKey: string | null;
  scope: RankingData['scope'];
  mode: RankingMode;
  /** Categoria em destaque na placa e unidade do placar (alunos ou turmas). */
  category: RankingCategory;
  unit: RankingUnit;
  /** Nome da temporada, escrito na sanca do palco. */
  seasonLabel: string;
  showCompany: boolean;
  /** Uma classificação nova carrega: a cortina fecha e só abre com o resultado. */
  pending: boolean;
}

/**
 * Palco do Hall da Fama: cortina de teatro (sem prendedores), pedestal pela posição, o personagem
 * montável do aluno com o fundo equipado e uma placa no tema do card dele (ou, nas turmas, o trio
 * padrão e os totais). A cortina abre na entrada da tela; ao trocar um filtro fecha, espera fechada a consulta nova (com o aviso "Trocando o placar…") e reabre com o resultado; trocar o
 * aluno em destaque só faz o personagem pular para o palco e os holofotes varrerem (como no canvas).
 * A cortina e a sanca ficam acima de tudo o que é do palco enquanto cobrem: o elenco (selo, setas,
 * placa) e o botão de cutucar só recebem foco e toque com a cortina aberta.
 */
export function HallStage(props: HallStageProps) {
  const { entries, selectedId, onSelect, sceneKey, viewerKey, scope, mode, category, unit, seasonLabel, showCompany, pending } = props;
  const uid = `hall${useId().replace(/[^A-Za-z0-9_-]/g, '')}`;
  const reduceMotion = useReducedMotion() === true;
  const liveEntry = selectedEntry(entries, selectedId);
  const curtain = useHallCurtain(sceneKey, pending, reduceMotion, celebrates(liveEntry?.position ?? 0));

  // Durante o fechamento o palco segue com a cena anterior: a nova só aparece quando a cortina reabre.
  const view = useHallView({ sceneKey, entries, selectedId }, curtain.shownKey);
  const entry = selectedEntry(view.entries, view.selectedId);
  const { phase } = curtain;
  // O elenco fica montado enquanto a cortina fecha (atrás dela) e só é tocável com a cortina aberta.
  const { mounted, live, steps, announce } = stageFlags(phase);
  const { prev, next, onKeyDown } = useHallSteps(view.entries, entry?.rankKey ?? null, steps, onSelect);
  if (!entry) return null;

  const me = isHallMe(entry, viewerKey);
  const theme = hallTheme(entry.look);
  return (
    <section className="hall" aria-labelledby={`${uid}-title`} aria-describedby={`${uid}-hint`} tabIndex={0} onKeyDown={live ? onKeyDown : undefined}>
      <h2 id={`${uid}-title`} className="rk-sr">Hall da Fama</h2>
      <p id={`${uid}-hint`} className="rk-sr">Use as setas esquerda e direita do teclado para trocar o aluno em destaque.</p>
      <div className={hallStageClass(entry.position, theme, { lit: curtain.lit, covered: phase === 'closing' })} style={theme.stage.style}>
        <HallScene uid={uid} position={entry.position} entryId={entry.rankKey} open={live} />
        <HallActor
          entryId={entry.rankKey}
          look={entry.look ?? {}}
          color={avatarTone(entry.rankKey, false).background}
          pokeLabel={hallPokeLabel(entry, me)}
          open={live}
          interactive={mounted}
          covered={!live}
          reduceMotion={reduceMotion}
          trio={hallTrio(entry)}
        />
        <HallCurtain uid={uid} phase={phase} />
        <HallValance uid={uid} />
        <p className="hall-season rk-display" aria-hidden="true">{seasonLabel}</p>
        {curtain.confetti && <HallConfetti />}
        <p className="hall-wait" role="status">{waitNotice(phase, pending, reduceMotion)}</p>
        {mounted && (
          <HallCastLayer
            entering={curtain.entering}
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
            covered={!live}
          />
        )}
      </div>
      <p className="rk-sr" role="status">{announce ? hallAnnouncement(entry, me, hallScopeText(scope, unit), category) : ''}</p>
    </section>
  );
}
