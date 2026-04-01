import { motion } from 'motion/react';

export function MissionsHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-16"
    >
      <div className="inline-block bg-[var(--surface-alt)] border-4 border-[var(--primary)] px-6 py-2 mb-6">
        <span className="text-[var(--primary)] font-['Press_Start_2P'] text-xs">
          MENU DE MISSÕES
        </span>
      </div>

      <h2 className="font-['Press_Start_2P'] text-3xl md:text-5xl text-[var(--text-primary)] mb-6">
        SUAS MISSÕES
      </h2>

      <p className="text-[var(--text-primary)] text-lg max-w-2xl mx-auto font-['Inter']">
        Complete cada fase para desbloquear novos conhecimentos
      </p>
    </motion.div>
  );
}