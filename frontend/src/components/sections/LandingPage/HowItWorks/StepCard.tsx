import { motion } from 'framer-motion';

interface StepCardProps {
  step: {
    id: number;
    title: string;
    description: string;
    icon: any;
    color: string;
  };
  index: number;
  isLast: boolean;
}

export function StepCard({ step, index, isLast }: StepCardProps) {
  const Icon = step.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="relative text-center"
    >
      <motion.div
          className="relative w-28 h-28 mx-auto mb-6 group"
          whileHover={{ scale: 1.08 }}
          transition={{ type: 'spring', stiffness: 300 }}
        >
        <div
          className="w-full h-full border rounded-md flex items-center justify-center shadow-[0_4px_16px_rgba(0,0,0,0.25)]"
          style={{
            backgroundColor: `color-mix(in srgb, ${step.color} 20%, transparent)`,
            borderColor: `color-mix(in srgb, ${step.color} 40%, transparent)`,
          }}
        >
          <Icon className="w-10 h-10" style={{ color: step.color }} />
        </div>

        <div className="absolute -top-2 -right-2 w-10 h-10 bg-[var(--background)] border border-[var(--border)] rounded-md flex items-center justify-center">
          <span className=" text-[var(--text-primary)]">
            {step.id}
          </span>
        </div>
      </motion.div>


      <h3 className="mb-3 text-[var(--text-primary)]">
        {step.title}
      </h3>

      <p className="text-[var(--text-primary)] text-sl  leading-relaxed">
        {step.description}
      </p>


      {!isLast && (
        <div className="hidden lg:block absolute top-14 -right-6 text-[var(--primary)]">
          ▶
        </div>
      )}
    </motion.div>
  );
}