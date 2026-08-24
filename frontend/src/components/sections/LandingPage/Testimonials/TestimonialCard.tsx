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
      className="group relative bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-6 shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
    >
  
      <div className="absolute top-0 left-0 right-0 h-2 bg-[var(--secondary)] rounded-t-lg" />


      <div className="flex items-start justify-between mb-5">
        <div className="relative">
          <div className="w-14 h-14 bg-[var(--primary)] border border-[var(--border)] rounded-md flex items-center justify-center">
            {testimonial.avatar}
          </div>

          <div className="absolute -bottom-2 -right-2 bg-[var(--accent)] border border-[var(--border)] rounded-md px-2 py-1">
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

      <div className="pt-3 border-t border-[var(--border)]">
        <div className="text-[var(--text-primary)]">
          {testimonial.name}
        </div>
        <div className="text-[var(--secondary)]">
          {testimonial.role}
        </div>
      </div>

      <div className="absolute inset-0 border rounded-lg border-[var(--secondary-30)] opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </motion.div>
  );
}