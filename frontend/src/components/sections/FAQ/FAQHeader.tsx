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
        <span className="text-[var(--primary)]">
          DÚVIDAS FREQUENTES
        </span>
      </div>

      <h2 className="md: text-[var(--text-primary)] mb-6">
        PERGUNTAS & RESPOSTAS
      </h2>

      <h4 className="text-[var(--text-primary)]  max-w-2xl mx-auto">
        Encontre respostas para as dúvidas mais comuns
      </h4>
    </motion.div>
  );
}