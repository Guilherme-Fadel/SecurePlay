import { motion } from 'motion/react';

export function BenefitsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-16"
    >
      <div className="inline-block bg-[var(--accent-15)] border border-[var(--accent-30)] rounded-md px-6 py-2 mb-6">
        <span className="text-[var(--accent-text)] font-semibold">
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