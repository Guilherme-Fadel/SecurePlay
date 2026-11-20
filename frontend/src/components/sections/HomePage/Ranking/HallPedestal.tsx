import { pedestalLabel, pedestalTier } from './hallModel';

interface HallPedestalProps {
  uid: string;
  position: number;
}

/** Pedestal em cilindro: ouro, prata e bronze para os três primeiros e neutro para as demais posições. */
export function HallPedestal({ uid, position }: HallPedestalProps) {
  const label = pedestalLabel(position);
  return (
    <g className={`hall-ped hall-tier--${pedestalTier(position)}`}>
      <ellipse className="hall-shadow" cx="300" cy="534" rx="128" ry="18" />
      <path className="hall-ink hall-ped-body" d="M182 446 V516 A118 22 0 0 0 418 516 V446 Z" fill={`url(#${uid}-ped)`} />
      <path className="hall-ped-ring" d="M182 470 A118 22 0 0 0 418 470 M182 494 A118 22 0 0 0 418 494" />
      <ellipse className="hall-ink hall-ped-top" cx="300" cy="446" rx="118" ry="22" />
      <ellipse className="hall-ped-inner" cx="300" cy="446" rx="96" ry="15" />
      <text className="hall-ped-num" x="300" y="510" textAnchor="middle" fontSize={label.size}>{label.text}</text>
      <ellipse className="hall-shadow hall-shadow--top" cx="300" cy="450" rx="72" ry="10" />
    </g>
  );
}
