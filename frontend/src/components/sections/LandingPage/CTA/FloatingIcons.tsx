import { motion } from 'motion/react';

export function FloatingIcons() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {[...Array(15)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute w-6 h-6 bg-[var(--accent)] border-2 border-[var(--border-primary)]"
          style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
          }}
          animate={{ y: [0, -20, 0], rotate: [0, 180, 360] }}
          transition={{
            duration: 3 + Math.random() * 2,
            repeat: Infinity,
            delay: Math.random() * 2,
          }}
        >
          <div className="flex items-center justify-center w-full h-full text-xs text-[var(--text-primary)]">
            ★
          </div>
        </motion.div>
      ))}
    </div>
  );
}