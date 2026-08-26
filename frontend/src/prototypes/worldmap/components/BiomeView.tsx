import { motion } from 'framer-motion';
import type { Biome, Level } from '../types';
import { BiomeBackground } from './BiomeBackground';
import { LevelNode } from './LevelNode';

interface BiomeViewProps {
  biome: Biome;
  onSelectLevel: (level: Level) => void;
  onBack: () => void;
  editMode: boolean;
  onReposition: (levelId: number, x: number, y: number) => void;
}

// Tela de Level Select de um bioma.
// Mesmo padrao do mapa global: fundo ambiente borrado + wrap centralizado
// com moldura retro. Os nodes ficam DENTRO do wrap para as posicoes em %
// baterem com a arte e a moldura os enquadrar.
export function BiomeView({
  biome,
  onSelectLevel,
  onBack,
  editMode,
  onReposition,
}: BiomeViewProps) {
  const levels = biome.levels;

  return (
    <motion.div
      className="wm-screen"
      initial={{ opacity: 0, scale: 1.08 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.4, ease: 'easeInOut' }}
    >
      {/* fundo ambiente borrado (preenche as laterais) */}
      <BiomeBackground biome={biome} variant="ambient" />

      <div className="wm-global-wrap wm-biome-wrap">
        {/* arte do bioma (placeholder por enquanto) */}
        <BiomeBackground biome={biome} />

        {levels.map((level) => (
          <LevelNode
            key={level.id}
            level={level}
            onClick={onSelectLevel}
            editMode={editMode}
            onReposition={onReposition}
          />
        ))}

        {/* moldura decorativa (nao intercepta cliques) */}
        <div className="wm-global-frame" aria-hidden="true" />
      </div>

      <div className="wm-biome-title" style={{ borderColor: biome.accent }}>
        <span style={{ color: biome.accent }}>{biome.name}</span>
        <small>{biome.subtitle}</small>
      </div>

      <button className="wm-back" onClick={onBack}>
        {'< Voltar'}
      </button>
    </motion.div>
  );
}
