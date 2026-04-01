import { motion, AnimatePresence } from 'motion/react';
import { Plus, Minus } from 'lucide-react';

export function FAQItem({ faq, index, isOpen, onToggle }: any) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -40 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.1 }}
      className="group"
    >
      <div
        className={`bg-[var(--surface-alt)] border-4 ${
          isOpen ? 'border-[var(--secondary)]' : 'border-[var(--border-primary)]'
        }`}
      >

        <button
          onClick={onToggle}
          className="cursor-none w-full px-6 py-6 flex justify-between items-center gap-4 text-left hover:bg-[var(--primary)]/10"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[var(--primary)] border-4 border-[var(--border-primary)] flex items-center justify-center text-xl">
              {faq.icon}
            </div>

            <span className="text-xl text-[var(--text-primary)]">
              {faq.question}
            </span>
          </div>

          <div
            className={`w-10 h-10 border-4 border-[var(--border-primary)] flex items-center justify-center ${
              isOpen ? 'bg-[var(--secondary)]' : 'bg-[var(--surface-alt)]'
            }`}
          >
            {isOpen ? (
              <Minus className="w-5 h-5 text-[var(--background)]" />
            ) : (
              <Plus className="w-5 h-5 text-[var(--text-primary)]" />
            )}
          </div>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-6 pb-6 ml-16">
                <div className="bg-[var(--background)] border-l-4 border-[var(--secondary)] p-6">
                  <p className="text-[var(--text-primary)] text-sm font-['Inter']">
                    {faq.answer}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>


      <div className="h-2 bg-[var(--primary)]/20 -mt-2 mx-2" />
    </motion.div>
  );
}