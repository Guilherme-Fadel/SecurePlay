import { motion } from 'motion/react';

export function BenefitCard({ item, index }: any) {
  const Icon = item.icon;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      whileInView={{ opacity: 1, scale: 1 }}
      viewport={{ once: true }}
      transition={{ delay: 0.1 }}
      whileHover={{ scale: 1.05, y: -5 }}
      className="group relative"
    >
      <div className="relative bg-[var(--surface-alt)] border-4 border-[var(--border-primary)] p-8 h-full">
        
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className={`w-full h-full border-4 border-[var(--border-primary)] flex items-center justify-center ${item.color}`}>
            <Icon className="w-10 h-10 text-[var(--text-primary)]" />
          </div>

          <div className={`absolute top-2 left-2 w-full h-full border-4 -z-10 ${item.borderColor} opacity-50`} />
        </div>

        <h3 className={`font-['PRESS_START_2P'] text-sm text-center mb-4 ${item.textColor}`}>
          {item.title}
        </h3>

        <p className="text-[var(--text-primary)] text-sm text-center font-['Inter']">
          {item.description}
        </p>

        <div className="mt-6 flex justify-center gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`w-3 h-3 border-2 border-[var(--border-primary)] ${
                i < (item.glow ? 3 : 2) ? item.color : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className={"absolute inset-0 border-4 " + item.borderColor + " opacity-0 group-hover:opacity-100 transition-opacity"} />
    </motion.div>
  );
}