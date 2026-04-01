import { motion } from 'motion/react';

export function CTATitle() {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 0.6 }}
      className="text-center mb-12"
    >
      <div className="inline-block bg-[var(--accent)] border-4 border-[var(--border-primary)] px-12 py-4 relative">
        <span className="font-['Press_Start_2P'] text-2xl md:text-3xl text-[var(--background)]">
          FASE FINAL
        </span>
      </div>
    </motion.div>
  );
}