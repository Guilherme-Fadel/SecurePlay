import { motion } from "motion/react";

export function SecurityLevelIndicator() {
  return (
    <div className="absolute -top-3 -right-3 z-10">
      <motion.div
        className="relative"
        animate={{ rotate: [0, 5, 0, -5, 0] }}
        transition={{ duration: 3, repeat: Infinity }}
      >
        <IndicatorBox />

        <ShadowLayer />

        <PulseDot />
      </motion.div>
    </div>
  );
}


function IndicatorBox() {
  return (
    <div className="relative bg-[var(--primary)] border-2 border-[var(--secondary)] px-3 py-1">
      <div className="flex items-center gap-2">
        <ShieldIcon />

        <span className="text-[var(--secondary)] tracking-wide">
          LV.1
        </span>
      </div>

      <CornerPixels />
    </div>
  );
}

function CornerPixels() {
  const cornerClass = "absolute w-1 h-1 bg-[var(--secondary)]";

  return (
    <>
      <div className={`${cornerClass} -top-0.5 -left-0.5`} />
      <div className={`${cornerClass} -top-0.5 -right-0.5`} />
      <div className={`${cornerClass} -bottom-0.5 -left-0.5`} />
      <div className={`${cornerClass} -bottom-0.5 -right-0.5`} />
    </>
  );
}

function ShadowLayer() {
  return (
    <div className="absolute inset-0 bg-[var(--background)] -z-10 translate-x-0.5 translate-y-0.5" />
  );
}

function PulseDot() {
  return (
    <motion.div
      className="absolute -top-1 -right-1 w-1 h-1 bg-[var(--secondary)]"
      animate={{
        scale: [0, 1, 0],
        opacity: [0, 1, 0],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        repeatDelay: 1,
      }}
    />
  );
}

function ShieldIcon() {
  return (
    <svg
      viewBox="0 0 12 12"
      className="w-3 h-3 text-[var(--secondary)]"
      fill="currentColor"
    >
      <polygon points="6,1 3,2 3,6 6,10 9,6 9,2" />
    </svg>
  );
}