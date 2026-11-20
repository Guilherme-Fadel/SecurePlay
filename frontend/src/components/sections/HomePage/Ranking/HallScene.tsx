import { useState } from 'react';
import { HallPedestal } from './HallPedestal';

const BULBS = [120, 180, 240, 300, 360, 420, 480] as const;

interface StopProps { offset: number; color: string; opacity?: number }

const Stop = ({ offset, color, opacity }: StopProps) => <stop offset={offset} style={{ stopColor: color }} stopOpacity={opacity} />;

/** Gradientes do palco; a cortina e a sanca (outros SVGs) apontam para estes mesmos ids. */
export function HallDefs({ uid }: { uid: string }) {
  const id = (name: string) => `${uid}-${name}`;
  return (
    <defs>
      <linearGradient id={id('vel0')} x1="0" x2="1">
        <Stop offset={0} color="var(--hall-velvet-dark)" /><Stop offset={0.32} color="var(--hall-velvet)" /><Stop offset={0.55} color="var(--hall-velvet-light)" />
        <Stop offset={0.78} color="var(--hall-velvet)" /><Stop offset={1} color="var(--hall-velvet-dark)" />
      </linearGradient>
      <linearGradient id={id('vel1')} x1="0" x2="1">
        <Stop offset={0} color="var(--hall-velvet-dark)" /><Stop offset={0.4} color="var(--sp-red)" /><Stop offset={0.62} color="var(--hall-velvet-light)" /><Stop offset={1} color="var(--hall-velvet-dark)" />
      </linearGradient>
      <linearGradient id={id('velv')} x1="0" y1="0" x2="0" y2="1"><Stop offset={0} color="var(--hall-velvet-light)" /><Stop offset={1} color="var(--hall-velvet-dark)" /></linearGradient>
      <linearGradient id={id('goldv')} x1="0" y1="0" x2="0" y2="1"><Stop offset={0} color="var(--hall-gold-light)" /><Stop offset={0.5} color="var(--sp-yellow)" /><Stop offset={1} color="var(--hall-gold-dark)" /></linearGradient>
      <linearGradient id={id('goldh')} x1="0" x2="1"><Stop offset={0} color="var(--hall-gold-dark)" /><Stop offset={0.35} color="var(--sp-yellow)" /><Stop offset={0.55} color="var(--hall-gold-light)" /><Stop offset={1} color="var(--hall-gold-dark)" /></linearGradient>
      <radialGradient id={id('goldr')} cx="38%" cy="35%" r="65%"><Stop offset={0} color="var(--hall-gold-light)" /><Stop offset={0.5} color="var(--sp-yellow)" /><Stop offset={1} color="var(--hall-gold-dark)" /></radialGradient>
      <linearGradient id={id('beam')} x1="0" y1="0" x2="0" y2="1"><Stop offset={0} color="var(--hall-light)" opacity={0.5} /><Stop offset={1} color="var(--hall-light)" opacity={0} /></linearGradient>
      <radialGradient id={id('pool')} cx="50%" cy="50%" r="50%"><Stop offset={0} color="var(--hall-light)" opacity={0.75} /><Stop offset={1} color="var(--hall-light)" opacity={0} /></radialGradient>
      <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1"><Stop offset={0} color="var(--hall-wood-top)" /><Stop offset={1} color="var(--hall-wood-bottom)" /></linearGradient>
      <radialGradient id={id('glow')} cx="50%" cy="50%" r="50%"><Stop offset={0} color="var(--hall-light)" opacity={0.95} /><Stop offset={1} color="var(--hall-light)" opacity={0} /></radialGradient>
      <linearGradient id={id('ped')} x1="0" x2="1">
        <Stop offset={0} color="var(--ped-edge)" /><Stop offset={0.3} color="var(--ped-mid)" /><Stop offset={0.5} color="var(--ped-hi)" />
        <Stop offset={0.75} color="var(--ped-mid)" /><Stop offset={1} color="var(--ped-edge)" />
      </linearGradient>
    </defs>
  );
}

/** Holofotes: varrem o palco quando alguém novo sobe com o palco aberto (remontados a cada aluno). */
function HallBeams({ uid, open }: { uid: string; open: boolean }) {
  const [sweep] = useState(open);
  return (
    <g className={sweep ? 'hall-beams is-sweep' : 'hall-beams'}>
      <polygon className="hall-beam is-left" points="70,30 110,30 330,520 150,520" fill={`url(#${uid}-beam)`} />
      <polygon className="hall-beam is-right" points="490,30 530,30 450,520 270,520" fill={`url(#${uid}-beam)`} />
    </g>
  );
}

interface HallSceneProps {
  uid: string;
  position: number;
  /** O aluno em destaque (remonta os holofotes) e se o palco já estava aberto quando ele subiu. */
  entryId: string;
  open: boolean;
}

/** Chão de madeira, ribalta, holofotes e o pedestal do aluno em destaque. */
export function HallScene({ uid, position, entryId, open }: HallSceneProps) {
  return (
    <svg className="hall-scene" viewBox="0 0 600 640" aria-hidden="true" focusable="false">
      <HallDefs uid={uid} />
      <HallBeams key={entryId} uid={uid} open={open} />
      <path className="hall-ink hall-floor" d="M50 500 H550 L600 586 H0 Z" fill={`url(#${uid}-wood)`} />
      <path className="hall-boards" d="M100 500 L60 586 M150 500 L120 586 M200 500 L180 586 M250 500 L240 586 M300 500 L300 586 M350 500 L360 586 M400 500 L420 586 M450 500 L480 586 M500 500 L540 586 M25 543 H575" />
      <rect className="hall-ink hall-apron" x="-4" y="586" width="608" height="60" />
      <path className="hall-apron-line" d="M0 597 H600" />
      {BULBS.map((x, index) => (
        <ellipse key={`glow${x}`} className="hall-glow" style={{ transitionDelay: `${index * 0.08}s` }} cx={x} cy="584" rx="36" ry="14" fill={`url(#${uid}-glow)`} />
      ))}
      {BULBS.map((x, index) => (
        <path key={`bulb${x}`} className="hall-ink is-fine hall-bulb" style={{ transitionDelay: `${index * 0.08}s` }} d={`M${x - 12} 587 Q${x} 572 ${x + 12} 587 Z`} />
      ))}
      <ellipse cx="300" cy="530" rx="190" ry="34" fill={`url(#${uid}-pool)`} />
      <HallPedestal uid={uid} position={position} />
    </svg>
  );
}
