import { motion } from 'framer-motion';

export function HeroTitle() {
  return (
    <motion.h1
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6, delay: 0.2 }}
      className="font-['Press_Start_2P'] text-3xl md:text-5xl lg:text-6xl text-[var(--text-primary)] mb-8 leading-tight"
    >
      SUBA DE NÍVEL NA
      <br />

      <span className="text-[var(--secondary)]">SEGURANÇA</span>
      <br />

      <span className="text-[var(--primary)]">DA INFORMAÇÃO</span>
    </motion.h1>
  );
}