import { useState } from 'react';
import { Pause, Play } from 'lucide-react';

const REPEAT = 6;

/** Faixa amarela com o slogan em movimento; pode ser pausada (WCAG 2.2.2). */
export function LandingMarquee() {
  const [paused, setPaused] = useState(false);
  return (
    <div className={`lp-marquee${paused ? ' is-paused' : ''}`}>
      <div className="lp-marquee-track" aria-hidden="true">
        {Array.from({ length: REPEAT }, (_, index) => (
          <span key={index} className="sp-display">Dê o play na aventura →<sup>®</sup></span>
        ))}
      </div>
      <button
        type="button"
        className="lp-marquee-toggle"
        onClick={() => setPaused((value) => !value)}
        aria-pressed={paused}
        aria-label={paused ? 'Retomar faixa animada' : 'Pausar faixa animada'}
      >
        {paused ? <Play size={16} strokeWidth={2.6} aria-hidden="true" /> : <Pause size={16} strokeWidth={2.6} aria-hidden="true" />}
      </button>
    </div>
  );
}
