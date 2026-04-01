import { motion } from "motion/react";

interface PixelMascotProps {
  className?: string;
}

export function PixelMascot({ className }: PixelMascotProps) {
  return (
    <motion.div
      className="relative inline-block"
      animate={{ y: [-3, 3, -3] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg viewBox="0 0 64 64" className={className}>

        <rect x="20" y="10" width="24" height="20" fill="var(--secondary)" />
        <rect x="18" y="12" width="4" height="16" fill="var(--secondary)" />
        <rect x="42" y="12" width="4" height="16" fill="var(--secondary)" />

        <rect x="24" y="16" width="16" height="8" fill="var(--background)" />

        <motion.rect
          x="27"
          y="18"
          width="3"
          height="3"
          fill="var(--primary)"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <motion.rect
          x="34"
          y="18"
          width="3"
          height="3"
          fill="var(--primary)"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
        />

        <rect x="18" y="30" width="28" height="18" fill="var(--primary)" />

        <rect x="30" y="36" width="4" height="6" fill="var(--secondary)" />
        <rect x="29" y="34" width="6" height="3" fill="var(--secondary)" />

        <rect x="12" y="32" width="6" height="12" fill="var(--primary)" />
        <rect x="46" y="32" width="6" height="12" fill="var(--primary)" />

        <rect x="22" y="48" width="6" height="10" fill="#2E3440" />
        <rect x="36" y="48" width="6" height="10" fill="#2E3440" />

      </svg>

      <motion.div
        className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-[var(--secondary)]"
        animate={{ scale: [1, 1.4, 1], opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      <motion.div
        className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-20 h-3 bg-black/25 rounded-full blur-sm"
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 2.5, repeat: Infinity }}
      />
    </motion.div>
  );
}