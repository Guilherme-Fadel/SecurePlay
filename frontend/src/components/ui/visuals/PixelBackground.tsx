import { motion } from "motion/react";
import { useMemo } from "react";

export function PixelBackground() {
  const particles = useMemo(() => generateParticles(30), []);

  return (
    <div className="fixed inset-0 overflow-hidden pointer-events-none">

      <BackgroundGradient />

      <PixelGrid />

      <Particles particles={particles} />

      <PixelDecorations />

      <ScanLines />

      <RadialFade />

    </div>
  );
}

function generateParticles(count: number) {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 2,
    duration: 3 + Math.random() * 2,
  }));
}

function Particles({ particles }: { particles: any[] }) {
  return (
    <>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1 bg-[var(--secondary)]"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            boxShadow: "0 0 4px var(--secondary)",
          }}
          animate={{
            y: [-10, 10, -10],
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
          }}
        />
      ))}
    </>
  );
}


function PixelGrid() {
  return (
    <div
      className="absolute inset-0 opacity-10"
      style={{
        backgroundImage: `
          linear-gradient(90deg, var(--secondary) 1px, transparent 1px),
          linear-gradient(var(--secondary) 1px, transparent 1px)
        `,
        backgroundSize: "20px 20px",
      }}
    />
  );
}


function BackgroundGradient() {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-[var(--background)] via-[var(--background)] to-[var(--primary)]/20" />
  );
}

function PixelDecorations() {
  return (
    <>
      <PixelCross top="top-10" left="left-20" color="var(--accent)" />
      <PixelCross top="top-32" right="right-40" color="var(--secondary)" />
      <PixelCross bottom="bottom-20" left="left-1/4" color="var(--primary)" />
      <PixelCross top="top-1/2" right="right-20" color="var(--accent)" />
      <PixelCross bottom="bottom-32" right="right-1/3" color="var(--secondary)" />
    </>
  );
}

function PixelCross({
  top,
  bottom,
  left,
  right,
  color,
}: {
  top?: string;
  bottom?: string;
  left?: string;
  right?: string;
  color: string;
}) {
  return (
    <div className={`absolute w-2 h-2 ${top ?? ""} ${bottom ?? ""} ${left ?? ""} ${right ?? ""}`}>
      <div className="absolute w-2 h-0.5" style={{ background: color }} />
      <div className="absolute h-2 w-0.5 left-0.5" style={{ background: color }} />
    </div>
  );
}

function ScanLines() {
  return (
    <div
      className="absolute inset-0 opacity-5 pointer-events-none"
      style={{
        backgroundImage:
        "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(var(--overlay-dark), 0.5) 2px, rgba(var(--overlay-dark), 0.5) 4px)",
      }}
    />
  );
}

function RadialFade() {
  return (
    <div className="absolute inset-0 bg-gradient-radial from-transparent via-transparent to-[var(--background)]/50" />
  );
}