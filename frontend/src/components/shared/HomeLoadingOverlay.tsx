import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

interface HomeLoadingOverlayProps {
  isLoading: boolean;
}

export function HomeLoadingOverlay({ isLoading }: HomeLoadingOverlayProps) {
  return (
    <AnimatePresence>
      {isLoading && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="absolute inset-0 z-50 flex items-center justify-center backdrop-blur-sm bg-[var(--background)]/80"
        >
          <div className="flex flex-col items-center gap-4">
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Shield className="w-10 h-10 text-[var(--secondary)]" />
            </motion.div>

            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="w-2.5 h-2.5 rounded-sm bg-[var(--secondary)]"
                  animate={{ opacity: [0.3, 1, 0.3], scale: [0.8, 1.1, 0.8] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>

            <p className="text-[var(--text-secondary)] text-sm">
              Carregando dados...
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
