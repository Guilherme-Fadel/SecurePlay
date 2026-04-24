import { motion } from 'motion/react';

export function BenefitsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-16"
    >
      <div className="inline-block bg-[var(--surface-alt)] border-4 border-[var(--accent)] px-6 py-2 mb-6">
        <span className="text-[var(--accent)]">
          POWER-UPS
        </span>
      </div>

      <h2 className="md: text-[var(--text-primary)] mb-6">
        BENEFÍCIOS
      </h2>

      <p className="text-[var(--text-primary)]  max-w-2xl mx-auto">
        Colete power-ups que transformarão sua organização
      </p>
    </motion.div>
  );
}