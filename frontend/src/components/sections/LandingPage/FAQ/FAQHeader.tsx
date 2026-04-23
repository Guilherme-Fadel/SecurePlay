import { motion } from 'motion/react';
import { HelpCircle } from 'lucide-react';

export function FAQHeader() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="text-center mb-16"
    >
      <div className="inline-flex items-center gap-3 bg-[var(--surface-alt)] border-4 border-[var(--primary)] px-6 py-2 mb-6">
        <HelpCircle className="w-5 h-5 text-[var(--primary)]" />
        <span className="text-[var(--primary)] font-['PRESS_START_2P'] text-xs">
          DÚVIDAS FREQUENTES
        </span>
      </div>

      <h2 className="font-['PRESS_START_2P'] text-3xl md:text-5xl text-[var(--text-primary)] mb-6">
        PERGUNTAS & RESPOSTAS
      </h2>

      <p className="text-[var(--text-primary)] text-lg max-w-2xl mx-auto font-['Inter']">
        Encontre respostas para as dúvidas mais comuns
      </p>
    </motion.div>
  );
}