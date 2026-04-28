import { motion } from 'framer-motion';

export function HeroTitle() {
  return (
    <motion.h1
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="md: lg: text-[var(--text-primary)] mb-8 leading-tight"
    >
      SUBA DE NÍVEL NA
      <br />

      <div className="text-[var(--secondary)]">SEGURANÇA</div>

      <div className="text-[var(--primary)]">DA INFORMAÇÃO</div>
    </motion.h1>
  );
}