import { motion } from 'motion/react';
import { Star } from 'lucide-react';

export function MissionCard({ mission, index }: any) {
  const Icon = mission.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ delay: index * 0.15 }}
      whileHover={{ y: -8 }}
      className="group relative bg-[var(--surface-alt)] border-4 border-[var(--primary)] p-8 overflow-hidden"
    >
      <div className={`absolute top-0 left-0 right-0 h-2 ${mission.color}`} />

      <div className="absolute top-4 right-4 w-12 h-12 bg-[var(--background)] border-4 border-[var(--border-primary)] flex items-center justify-center">
        <span className=" text-[var(--text-primary)]">
          {mission.id}
        </span>
      </div>

      <div className={`w-16 h-16 border-4 border-[var(--border-primary)] mb-6 flex items-center justify-center relative ${mission.color}`}>
        <Icon className="w-8 h-8 text-[var(--text-primary)]" />

        {mission.progress === 100 && (
          <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent)] border-2 border-[var(--border-primary)] flex items-center justify-center">
            <Star className="w-3 h-3 text-[var(--text-primary)] fill-white" />
          </div>
        )}
      </div>

      <h3 className="text-[var(--text-primary)] mb-2">
        {mission.title}
      </h3>

      <p className="text-[var(--secondary)]   mb-4">
        {mission.subtitle}
      </p>

      <p className="text-[var(--text-primary)]  mb-6">
        {mission.description}
      </p>
        
      <ProgressBar value={mission.progress} color={mission.color} index={index} />

      <div className="flex justify-between items-center pt-4 border-t-2 border-[var(--primary)]">
        <span className="text-[var(--text-primary)]">
            {mission.difficulty}
        </span>

        <span className="text-[var(--secondary)]">
            {mission.xp}
        </span>
      </div>

      <div className="absolute inset-0 border-4 border-[var(--secondary)] opacity-0 group-hover:opacity-100 transition-opacity" />
    </motion.div>
  );
}

function ProgressBar({ value, color, index }: any) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-2">
        <span className="text-[var(--text-primary)]">
          PROGRESSO
        </span>

        <span className="text-[var(--secondary)]">
          {value}%
        </span>
      </div>

      <div className="h-4 bg-[var(--background)] border-2 border-[var(--border-primary)] overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${value}%` }}
          viewport={{ once: true }}
          transition={{ delay: 0.3 + index * 0.15 }}
          className={`h-full ${color}`}
        />
      </div>
    </div>
  );
}