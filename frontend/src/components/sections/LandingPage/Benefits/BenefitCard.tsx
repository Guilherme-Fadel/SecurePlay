import { motion } from 'motion/react';
import { Shield, Star, Heart, Zap, Award, Users } from 'lucide-react';

export function BenefitCard({ item }: any) {
  const iconMap: Record<string, React.ElementType> = { Shield, Star, Heart, Zap, Award, Users };

  const Icon = iconMap[item.icon] ?? Shield;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group relative"
    >
      <div className="relative bg-[var(--surface-alt)] border border-[var(--border)] rounded-lg p-8 h-full shadow-[0_4px_16px_rgba(0,0,0,0.25)]">

        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className={`w-full h-full border rounded-md flex items-center justify-center ${item.color} ${item.borderColor}`}>
            <Icon className={`w-10 h-10 ${item.textColor}`} />
          </div>
        </div>

        <h3 className="text-center mb-4 text-[var(--text-primary)]">
          {item.title}
        </h3>

        <p className="text-[var(--text-secondary)] text-center">
          {item.description}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 rounded-sm border border-[var(--border)] ${
                i < (item.glow ? 3 : 2) ? item.color : ''
              }`}
            />
          ))}
        </div>
      </div>
    </motion.div>
  );
}
