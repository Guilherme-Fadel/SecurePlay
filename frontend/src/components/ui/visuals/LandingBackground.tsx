import { motion } from 'motion/react';
import { useMemo } from 'react';

// Fundo global animado da Landing: gradiente + grid pixel + scanlines +
// orbs de cor flutuantes + particulas. Camada fixa atras de todo o conteudo.
// Da "vida" ao fundo sem competir com as secoes (opacidades controladas).
export function LandingBackground() {
  const particles = useMemo(() => generateParticles(40), []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      {/* base */}
      <div className="absolute inset-0 bg-[var(--background)]" />
      <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/10 via-transparent to-[var(--secondary)]/10" />

      {/* orbs de cor que flutuam lentamente */}
      <ColorOrb
        className="w-[46vw] h-[46vw] -top-[12vw] -left-[10vw]"
        color="var(--primary)"
        drift={{ x: [0, 40, 0], y: [0, 30, 0] }}
        duration={18}
      />
      <ColorOrb
        className="w-[40vw] h-[40vw] top-[30%] -right-[12vw]"
        color="var(--secondary)"
        drift={{ x: [0, -50, 0], y: [0, 40, 0] }}
        duration={22}
      />
      <ColorOrb
        className="w-[34vw] h-[34vw] -bottom-[10vw] left-[20%]"
        color="var(--accent)"
        drift={{ x: [0, 30, 0], y: [0, -30, 0] }}
        duration={26}
        opacity={0.1}
      />

      {/* grid pixel */}
      <div
        className="absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage: `
            linear-gradient(90deg, var(--secondary) 1px, transparent 1px),
            linear-gradient(var(--secondary) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
        }}
      />

      {/* particulas */}
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute w-1 h-1"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            background: p.color,
            boxShadow: `0 0 4px ${p.color}`,
          }}
          animate={{ y: [-12, 12, -12], opacity: [0.1, 0.45, 0.1] }}
          transition={{ duration: p.duration, repeat: Infinity, delay: p.delay }}
        />
      ))}

      {/* scanlines */}
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 3px, rgba(0,0,0,0.6) 3px, rgba(0,0,0,0.6) 4px)',
        }}
      />

      {/* vinheta para dar profundidade nas bordas */}
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(120% 90% at 50% 40%, transparent 55%, rgba(0,0,0,0.45) 100%)',
        }}
      />
    </div>
  );
}

interface ColorOrbProps {
  className: string;
  color: string;
  drift: { x: number[]; y: number[] };
  duration: number;
  opacity?: number;
}

function ColorOrb({ className, color, drift, duration, opacity = 0.16 }: ColorOrbProps) {
  return (
    <motion.div
      className={`absolute rounded-full blur-[80px] ${className}`}
      style={{ background: color, opacity }}
      animate={{ x: drift.x, y: drift.y }}
      transition={{ duration, repeat: Infinity, ease: 'easeInOut' }}
    />
  );
}

function generateParticles(count: number) {
  const colors = ['var(--secondary)', 'var(--primary)', 'var(--accent)'];
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    delay: Math.random() * 3,
    duration: 3 + Math.random() * 3,
    color: colors[i % colors.length],
  }));
}
