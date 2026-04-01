import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Shield } from 'lucide-react';

const LOADING_MESSAGES = [
  { max: 30, text: 'INICIALIZANDO SISTEMAS DE SEGURANÇA...' },
  { max: 60, text: 'ATIVANDO PROTEÇÃO DE DADOS...' },
  { max: 90, text: 'CARREGANDO MISSÕES...' },
  { max: 100, text: 'PRONTO PARA JOGAR!' },
];

function getLoadingMessage(progress: number) {
  return LOADING_MESSAGES.find(m => progress <= m.max)?.text;
}

export function LoadingScreen() {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => setIsVisible(false), 500);
          return 100;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.5 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-[var(--background)]"
        >
          <div className="absolute inset-0 opacity-5">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `
                  linear-gradient(0deg, transparent 24%, rgba(31,106,225,.3) 25%, rgba(31,106,225,.3) 26%, transparent 27%, transparent 74%, rgba(31,106,225,.3) 75%, rgba(31,106,225,.3) 76%, transparent 77%, transparent),
                  linear-gradient(90deg, transparent 24%, rgba(31,106,225,.3) 25%, rgba(31,106,225,.3) 26%, transparent 27%, transparent 74%, rgba(31,106,225,.3) 75%, rgba(31,106,225,.3) 76%, transparent 77%, transparent)
                `,
                backgroundSize: '40px 40px',
              }}
            />
          </div>

          <div className="relative z-10 text-center">

            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', duration: 0.5 }}
              className="mb-8"
            >
              <div className="relative mx-auto flex h-24 w-24 items-center justify-center border-4 border-[var(--border-primary)] bg-[var(--primary)]">
                <Shield className="w-12 h-12 text-[var(--text-primary)]" />

                <motion.div
                  className="absolute -top-2 -right-2 h-6 w-6 border-2 border-[var(--border-primary)] bg-[var(--secondary)]"
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ duration: 1, repeat: Infinity }}
                />
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mb-8"
            >
              <h1 className="font-['Press_Start_2P'] text-2xl text-[var(--text-primary)]">
                SECUREPLAY
              </h1>
              <p className="font-['Press_Start_2P'] text-xs text-[var(--secondary)]">
                CARREGANDO...
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="w-80 max-w-[90vw]"
            >
              <div className="mb-2 flex justify-between text-xs font-['Press_Start_2P']">
                <span className="text-[var(--text-primary)]">PROGRESSO</span>
                <span className="text-[var(--secondary)]">{progress}%</span>
              </div>

              <div className="relative h-8 overflow-hidden border-4 border-[var(--border-primary)] bg-[var(--surface-alt)]">
                <motion.div
                  className="relative h-full bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                >
                  <motion.div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent opacity-30"
                    animate={{ x: ['0%', '100%'] }}
                    transition={{ duration: 1, repeat: Infinity }}
                  />
                </motion.div>
              </div>

              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.7 }}
                className="mt-6 text-[10px] text-[var(--text-primary)] font-['Press_Start_2P']"
              >
                {getLoadingMessage(progress)}
              </motion.p>
            </motion.div>

            <div className="absolute -bottom-20 left-1/2 flex -translate-x-1/2 gap-4">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="h-4 w-4 border-2 border-[var(--border-primary)] bg-[var(--primary)]"
                  animate={{ y: [0, -10, 0], opacity: [0.5, 1, 0.5] }}
                  transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}