import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

export function HeroBadge() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="inline-flex items-center gap-2 bg-[var(--surface-alt)] border-4 border-[var(--accent)] px-6 py-3 mb-8"
    >
      <Sparkles className="w-5 h-5 text-[var(--accent)]" />
      
      <span className="text-[var(--accent)] font-['Press_Start_2P'] text-xs">
        NÍVEL 1: INICIANTE
      </span>
    </motion.div>
  );
}