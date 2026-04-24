import { motion } from 'framer-motion';
import { Star } from 'lucide-react';

interface Props {
  testimonial: any;
  index: number;
}

export function TestimonialCard({ testimonial, index }: Props) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: 0.1 }}
      whileHover={{ y: -6 }}
      className="group relative bg-[var(--surface-alt)] border-4 border-[var(--border-primary)] p-6"
    >
  
      <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--secondary)]" />


      <div className="flex items-start justify-between mb-5">
        <div className="relative">
          <div className="w-14 h-14 bg-[var(--primary)] border-4 border-[var(--border-primary)] flex items-center justify-center">
            {testimonial.avatar}
          </div>

          <div className="absolute -bottom-2 -right-2 bg-[var(--accent)] border-2 border-[var(--border-primary)] px-2 py-1">
            <span className="text-[var(--background)]">
              {testimonial.level}
            </span>
          </div>
        </div>

        <div className="flex gap-1">
          {[...Array(testimonial.rating)].map((_, i) => (
            <Star
              key={i}
              className="w-4 h-4 text-[var(--accent)] fill-[var(--accent)]"
            />
          ))}
        </div>
      </div>

      <p className="text-[var(--text-primary)]   mb-5 leading-relaxed">
      "{testimonial.message}"
      </p>

      <div className="pt-3 border-t-2 border-[var(--primary)]">
        <div className="text-[var(--text-primary)]">
          {testimonial.name}
        </div>
        <div className="text-[var(--secondary)]">
          {testimonial.role}
        </div>
      </div>

      <div className="absolute inset-0 border-4 border-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}