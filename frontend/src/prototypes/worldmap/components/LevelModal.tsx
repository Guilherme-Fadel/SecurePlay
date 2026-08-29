import { motion, AnimatePresence } from 'framer-motion';
import type { Level } from '../types';
interface LevelModalProps {
    level: Level | null;
    onClose: () => void;
    onStart: (level: Level) => void;
}
export function LevelModal({ level, onClose, onStart }: LevelModalProps) {
    return (<AnimatePresence>
      {level && (<motion.div className="wm-modal-overlay" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
          <motion.div className={`wm-modal ${level.status === 'LOCKED' ? 'wm-modal-locked' : ''}`} onClick={(e) => e.stopPropagation()} initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.85, opacity: 0 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}>
            <button className="wm-modal-close" onClick={onClose}>
              x
            </button>

            {level.status === 'LOCKED' ? (<>
                <div className="wm-modal-badge wm-badge-locked">
                  FASE BLOQUEADA
                </div>
                <div className="wm-lock-big">L</div>
                <p className="wm-modal-desc">
                  Esta fase ainda nao esta disponivel. Conclua as fases
                  anteriores para desbloquea-la.
                </p>
              </>) : (<>
                <div className="wm-modal-badge">
                  FASE {String(level.id).padStart(2, '0')}
                </div>
                <h2 className="wm-modal-name">{level.name}</h2>
                <div className="wm-modal-meta">
                  <span className="wm-modal-diff">Nivel: {level.difficulty}</span>
                  <span className={`wm-status wm-status-${level.status.toLowerCase()}`}>
                    {level.status === 'COMPLETED' ? 'Concluida' : 'Disponivel'}
                  </span>
                </div>
                <p className="wm-modal-desc">{level.description}</p>
                <button className="wm-modal-start" onClick={() => onStart(level)}>
                  {level.status === 'COMPLETED' ? 'REVISAR FASE' : 'INICIAR FASE'}
                </button>
              </>)}
          </motion.div>
        </motion.div>)}
    </AnimatePresence>);
}
