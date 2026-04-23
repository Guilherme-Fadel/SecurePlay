import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useNavigate } from 'react-router-dom';

export function PressStartScreen() {
  const [show, setShow] = useState(true);
  const navigate = useNavigate();

  const handleStart = () => {
  setShow(false);

  setTimeout(() => {
    navigate('/login');
  }, 400);
};

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.code === 'Enter' || e.code === 'Space') {
        handleStart();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, []);

  if (!show) return null;

  return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-[var(--background)] z-50 flex items-center justify-center cursor-none"
        >
          <div className="text-center space-y-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, type: 'spring' }}
            >
              <h1 className="md: text-[var(--secondary)] mb-4 tracking-wide">
                SECURITY
              </h1>
              <h2 className="md: text-[var(--primary)] tracking-wide">
                QUEST
              </h2>
            </motion.div>
  
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3 }}
              className="flex justify-center"
            >
              <svg viewBox="0 0 48 48" className="w-32 h-32">
                <motion.polygon
                  points="24,6 12,10 12,20 24,32 36,20 36,10"
                  fill="var(--primary)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.5, type: 'spring' }}
                />
                <motion.polygon
                  points="24,10 16,13 16,20 24,28 32,20 32,13"
                  fill="var(--secondary)"
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: 0.7, type: 'spring' }}
                />
                
                <motion.g
                  initial={{ rotate: 0 }}
                  animate={{ rotate: 360 }}
                  transition={{ delay: 1, duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <rect x="23" y="18" width="2" height="6" fill="var(--accent)" />
                  <rect x="21" y="20" width="6" height="2" fill="var(--accent)" />
                </motion.g>
              </svg>
            </motion.div>
  
            <motion.button
              onClick={handleStart}
              className="text-[var(--text-primary)] hover:text-[var(--secondary)] transition-colors tracking-wide cursor-none"
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
            >
              PRESS START
            </motion.button>
  
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="text-[var(--text-secondary)]"
            >
              Pressione ENTER ou clique para começar
            </motion.p>
          </div>
  
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {Array.from({ length: 20 }).map((_, i) => (
              <motion.div
                key={i}
                className="absolute w-1 h-1 bg-[var(--secondary)]"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                }}
                animate={{
                  scale: [0, 1, 0],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 2 + Math.random() * 2,
                  repeat: Infinity,
                  delay: Math.random() * 2,
                }}
              />
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    );
}
