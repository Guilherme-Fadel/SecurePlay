import { motion } from 'framer-motion';
import { testimonials } from './data';
import { TestimonialCard } from './TestimonialCard';

export function TestimonialsSection() {
  return (
    <section
      id="depoimentos"
      className="relative py-24 bg-gradient-to-b from-[var(--surface)] to-[var(--background)] overflow-hidden"
    >
      <div className="absolute inset-0 opacity-5">
        <div className="absolute top-10 left-10 w-24 h-24 border-4 border-[var(--accent)]" />
        <div className="absolute bottom-10 right-10 w-32 h-32 border-4 border-[var(--secondary)]" />
      </div>

      <div className="max-w-6xl mx-auto px-6 mb-16 text-center relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
        >
          <div className="inline-block bg-[var(--surface-alt)] border-4 border-[var(--secondary)] px-6 py-2 mb-6">
            <span className="text-[var(--secondary)] font-['Press_Start_2P'] text-xs">
              HALL DA FAMA
            </span>
          </div>

          <h2 className="font-['Press_Start_2P'] text-3xl md:text-5xl text-[var(--text-primary)] mb-4">
            JOGADORES ELITE
          </h2>

          <p className="text-[var(--text-primary)] text-lg font-['Inter']">
            Veja o que nossos campeões dizem
          </p>
        </motion.div>
      </div>

   
      <div className="max-w-6xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
        {testimonials.map((t, i) => (
          <TestimonialCard key={t.id} testimonial={t} index={i} />
        ))}
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        whileInView={{ opacity: 1, scale: 1 }}
        viewport={{ once: true }}
        className="mt-16 text-center"
      >
        <div className="inline-flex items-center gap-4 bg-[var(--background)] border-4 border-[var(--accent)] px-6 py-4">
          <div className="w-10 h-10 bg-[var(--accent)] border-4 border-[var(--border-primary)] flex items-center justify-center">
            🏆
          </div>

          <div className="text-left">
            <div className="font-['Press_Start_2P'] text-xs text-[var(--accent)]">
              +100 EMPRESAS
            </div>
            <div className="text-[var(--text-primary)] font-['Press_Start_2P'] text-[10px]">
              98% SATISFAÇÃO • 4.9★
            </div>
          </div>
        </div>
      </motion.div>
    </section>
  );
}