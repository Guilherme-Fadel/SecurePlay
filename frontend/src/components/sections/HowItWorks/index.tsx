import { motion } from 'framer-motion';
import { steps } from './data';
import { StepCard } from './StepCard';

export function HowItWorksSection() {
  return (
    <section
      id="como-funciona"
      className="relative py-24 bg-gradient-to-b from-[var(--background)] via-[var(--surface)] to-[var(--background)] overflow-hidden"
    >
  
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-20 left-10 w-32 h-32 border-8 border-[var(--primary)]" />
        <div className="absolute bottom-20 right-10 w-40 h-40 border-8 border-[var(--secondary)]" />
      </div>


      <div className="max-w-6xl mx-auto px-6 mb-16 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block bg-[var(--surface-alt)] border-4 border-[var(--secondary)] px-6 py-2 mb-6">
            <span className="text-[var(--secondary)]">
              MAPA DO JOGO
            </span>
          </div>

          <h2 className="md: text-[var(--text-primary)]">
            COMO FUNCIONA
          </h2>
        </motion.div>
      </div>

      <div className="max-w-6xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10 relative">
          {steps.map((step, index) => (
            <StepCard
              key={step.id}
              step={step}
              index={index}
              isLast={index === steps.length - 1}
            />
          ))}
        </div>
      </div>
    </section>
  );
}