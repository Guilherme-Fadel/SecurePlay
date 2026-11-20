import { CONFETTI } from './hallModel';

/** Confete curto quando o 1º lugar sobe ao palco; decorativo e ausente com movimento reduzido. */
export function HallConfetti() {
  return (
    <div className="hall-confetti" aria-hidden="true">
      {CONFETTI.map((piece) => (
        <i key={`${piece.left}-${piece.delay}`} style={{ left: `${piece.left}%`, background: piece.color, animationDelay: `${piece.delay}s`, animationDuration: `${piece.duration}s` }} />
      ))}
    </div>
  );
}
