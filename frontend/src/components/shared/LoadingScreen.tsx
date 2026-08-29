import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ShieldCheck } from 'lucide-react';

const LOADING_MESSAGES = [
  { max: 30, text: 'Inicializando sua área segura...' },
  { max: 60, text: 'Sincronizando seu perfil...' },
  { max: 90, text: 'Carregando suas missões...' },
  { max: 100, text: 'Tudo pronto!' },
];

function getLoadingMessage(progress: number) {
  return LOADING_MESSAGES.find(m => progress <= m.max)?.text;
}

interface LoadingScreenProps {
  ready?: boolean;
}

export function LoadingScreen({ ready = false }: LoadingScreenProps) {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(0);
  const [minTimePassed, setMinTimePassed] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + 10;
      });
    }, 150);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setMinTimePassed(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (ready && minTimePassed) {
      setProgress(100);
      setTimeout(() => setIsVisible(false), 500);
    }
  }, [ready, minTimePassed]);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="app-loading-screen fixed inset-0 z-[100] flex items-center justify-center"
        >
          <div className="app-loading-orbit app-loading-orbit-left" aria-hidden="true" />
          <div className="app-loading-orbit app-loading-orbit-right" aria-hidden="true" />

          <motion.div
            initial={{ y: 14, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className="app-loading-card relative z-10 text-center"
          >

            <motion.div
              className="app-loading-logo"
              animate={{ y: [0, -5, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <ShieldCheck aria-hidden="true" />
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="app-loading-copy"
            >
              <span className="app-loading-brand">SecurePlay</span>
              <h1>Preparando seu painel</h1>
              <p>Sua jornada de aprendizado está quase pronta.</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="app-loading-progress"
            >
              <div className="app-loading-progress-meta">
                <span>{getLoadingMessage(progress)}</span>
                <strong>{progress}%</strong>
              </div>

              <div className="app-loading-track">
                <motion.div
                  className="app-loading-value"
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.25 }}
                />
              </div>
            </motion.div>

            <div className="app-loading-dots" aria-hidden="true">
              {[0, 1, 2].map(i => (
                <motion.div
                  key={i}
                  className="app-loading-dot"
                  animate={{ y: [0, -4, 0], opacity: [0.35, 1, 0.35] }}
                  transition={{ duration: 0.9, repeat: Infinity, delay: i * 0.16 }}
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
