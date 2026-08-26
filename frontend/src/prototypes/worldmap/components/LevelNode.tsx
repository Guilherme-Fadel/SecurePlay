import { useRef } from 'react';
import { motion, useMotionValue, type PanInfo } from 'framer-motion';
import type { Level } from '../types';

interface LevelNodeProps {
  level: Level;
  onClick: (level: Level) => void;
  editMode: boolean;
  onReposition: (levelId: number, x: number, y: number) => void;
}

// Node de uma fase, posicionado por cima do fundo do bioma (posicao em %).
// Estados: COMPLETED (estrela), AVAILABLE (brilho pulsante), LOCKED (cadeado).
// Em editMode o node pode ser arrastado para reposicionar (calibragem do layout).
export function LevelNode({
  level,
  onClick,
  editMode,
  onReposition,
}: LevelNodeProps) {
  const isLocked = level.status === 'LOCKED';
  const ref = useRef<HTMLButtonElement>(null);

  // Controlamos o offset do drag manualmente. Assim, ao soltar, zeramos o
  // transform do Framer Motion e deixamos APENAS o left/top (em %) posicionar.
  // Sem isso, o transform do drag soma com o novo left/top e o node "salta".
  const dragX = useMotionValue(0);
  const dragY = useMotionValue(0);

  const handleDragEnd = (_e: unknown, _info: PanInfo) => {
    const node = ref.current;
    const parent = node?.parentElement;
    if (!node || !parent) return;

    // Usa o CENTRO real do node (nao a posicao do ponteiro), evitando offset
    // quando o usuario agarra o node fora do centro.
    const nodeRect = node.getBoundingClientRect();
    const rect = parent.getBoundingClientRect();
    const centerX = nodeRect.left + nodeRect.width / 2;
    const centerY = nodeRect.top + nodeRect.height / 2;

    const x = ((centerX - rect.left) / rect.width) * 100;
    const y = ((centerY - rect.top) / rect.height) * 100;
    const clampedX = Math.max(0, Math.min(100, x));
    const clampedY = Math.max(0, Math.min(100, y));

    // zera o offset do drag ANTES de atualizar o left/top no estado
    dragX.set(0);
    dragY.set(0);

    onReposition(level.id, +clampedX.toFixed(1), +clampedY.toFixed(1));
  };

  return (
    <motion.button
      ref={ref}
      className={`wm-node wm-node-${level.status.toLowerCase()} ${
        editMode ? 'wm-node-editing' : ''
      }`}
      style={{
        left: `${level.position.x}%`,
        top: `${level.position.y}%`,
        x: dragX,
        y: dragY,
      }}
      onClick={() => {
        if (!editMode) onClick(level);
      }}
      drag={editMode}
      dragMomentum={false}
      dragElastic={0}
      onDragEnd={handleDragEnd}
      whileHover={{ scale: isLocked && !editMode ? 1.05 : 1.15 }}
      whileTap={{ scale: editMode ? 1.1 : 0.95 }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 18 }}
    >
      {level.status === 'AVAILABLE' && !editMode && (
        <motion.span
          className="wm-node-glow"
          animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: 'easeOut' }}
        />
      )}

      <span className="wm-node-face">
        {level.status === 'COMPLETED' ? (
          <span className="wm-node-star">*</span>
        ) : level.status === 'LOCKED' ? (
          <span className="wm-node-lock">L</span>
        ) : (
          <span className="wm-node-id">{level.id}</span>
        )}
      </span>

      {editMode && (
        <span className="wm-node-coords">
          {level.position.x}, {level.position.y}
        </span>
      )}
    </motion.button>
  );
}
