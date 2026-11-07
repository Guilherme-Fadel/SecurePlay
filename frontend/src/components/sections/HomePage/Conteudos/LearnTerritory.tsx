import type { CSSProperties } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { ModuloCard } from './ModuloCard';
import { percentOf, type LearnTerritory, type TerritoryIndex } from './learnMapModel';

export const TERRITORY_PANEL_ID = 'lv-territory-panel';

interface LearnLevelsProps {
  territories: LearnTerritory[];
  selected: TerritoryIndex;
  onSelect: (index: TerritoryIndex) => void;
}

/** Segmentos Fácil/Médio/Difícil; cada um mostra o território no painel. */
export function LearnLevels({ territories, selected, onSelect }: LearnLevelsProps) {
  return (
    <div className="lv-seg" role="group" aria-label="Nível">
      {territories.map((territory) => (
        <button
          key={territory.index}
          type="button"
          aria-pressed={territory.index === selected}
          aria-controls={TERRITORY_PANEL_ID}
          onClick={() => onSelect(territory.index)}
        >
          <i aria-hidden="true" style={{ '--lv-dot': territory.color } as CSSProperties} />
          <span><b>{territory.level}</b><small>{territory.title}</small></span>
        </button>
      ))}
    </div>
  );
}

function summaryLine(territory: LearnTerritory): string {
  const modules = territory.modules.length;
  const done = territory.completedModules;
  return `${modules} ${modules === 1 ? 'módulo' : 'módulos'} · ${done} ${done === 1 ? 'concluído' : 'concluídos'} · ${territory.completedLessons} de ${territory.totalLessons} aulas`;
}

interface LearnTerritoryPanelProps {
  territory: LearnTerritory;
  onOpenModulo: (moduloId: number) => void;
}

/** Painel do território selecionado: apresentação, progresso e lista de módulos. */
export function LearnTerritoryPanel({ territory, onOpenModulo }: LearnTerritoryPanelProps) {
  const reduceMotion = useReducedMotion();
  const percent = percentOf(territory.completedLessons, territory.totalLessons);
  const titleId = `lv-territory-title-${territory.index}`;
  return (
    <motion.section
      key={territory.index}
      id={TERRITORY_PANEL_ID}
      className="lv-territory"
      aria-labelledby={titleId}
      initial={reduceMotion ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      <div className="lv-territory-head">
        <BrandCharacter className="lv-territory-art" body={territory.color} face={territory.face} />
        <div>
          <p className="lv-eyebrow">Nível {territory.level} · Território</p>
          <h2 id={titleId} className="lv-display">{territory.title}</h2>
        </div>
      </div>
      <p className="lv-territory-text">{territory.description}</p>

      {territory.modules.length === 0 ? (
        <p className="lv-territory-empty">Ainda não há módulos neste nível. Novos módulos aparecem aqui quando forem publicados.</p>
      ) : (
        <>
          <div className="lv-territory-progress">
            <span>{summaryLine(territory)}</span>
            <span
              className="lv-bar"
              role="progressbar"
              aria-label="Aulas concluídas neste nível"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={percent}
            >
              <span style={{ width: `${percent}%` }} />
            </span>
          </div>
          <h3 className="lv-mods-title">Módulos deste nível</h3>
          <ul className="lv-mods" aria-label={`Módulos de ${territory.title}`}>
            {territory.modules.map((item) => (
              <li key={item.modulo.id}><ModuloCard item={item} onOpen={onOpenModulo} /></li>
            ))}
          </ul>
        </>
      )}
    </motion.section>
  );
}
