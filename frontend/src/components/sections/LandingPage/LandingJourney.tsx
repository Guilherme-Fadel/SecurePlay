import { useRef } from 'react';
import { motion, useTransform } from 'motion/react';
import type { MotionValue } from 'motion/react';
import { Check, Lock } from 'lucide-react';
import flagIcon from '@/assets/static/mission-room/icon-flag.webp';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { JOURNEY_PATH, JOURNEY_PATH_LENGTH, JOURNEY_STOPS, TERRITORIES, characterPosition, territoryProgress } from './journey';
import type { Territory } from './journey';
import { useJourneyProgress } from './useJourneyProgress';

const PEBBLE_PATH = 'M24.992 80.248C12.298 93.583-8.017 100.251-35.968 100.251-63.903 100.251-83.901 93.733-95.972 80.727-108.026 67.703-114.074 50.396-114.074 28.817-114.074 7.221-108.026-10.236-95.972-23.571-83.901-36.906-63.903-43.574-35.968-43.574-8.017-43.574 12.298-36.906 24.992-23.571 37.704-10.236 44.042 7.221 44.042 28.817 44.042 49.772 37.704 66.913 24.992 80.248';
const CROWN_PATH = 'M0 0C-7.494-6.648-24.607-7.544-31.769-7.616L-31.767-7.618H-31.98C-32.62-7.623-33.176-7.622-33.629-7.618H-36.402C-36.855-7.622-37.412-7.623-38.051-7.618H-38.075C-45.12-7.559-62.47-6.708-70.032 0-79.638 8.522-85.525 39.664-76.539 45.242-67.553 50.819-58.001 34.241-58.001 34.241-58.001 34.241-47.566 64.299-35.016 64.299-22.466 64.299-12.03 34.241-12.03 34.241-12.03 34.241-2.479 50.819 6.507 45.242 15.494 39.664 9.606 8.522 0 0';
const PILL_GAP = 6;
const SYMBOL_TRANSFORM = 'matrix(1 0 0 -1 114.2315 100.4042)';

function TerritoryBar({ progress, territory }: { progress: MotionValue<number>; territory: Territory }) {
  const width = useTransform(progress, (value) => `${territoryProgress(value, territory)}%`);
  return <div className="lp-jr-bar" aria-hidden="true"><motion.i style={{ width }} /></div>;
}

export function LandingJourney() {
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const { progress, snapshot } = useJourneyProgress(sectionRef, pinRef, headRef);
  const dashOffset = useTransform(progress, (value) => JOURNEY_PATH_LENGTH * (1 - value));
  const trailOpacity = useTransform(progress, (value) => (value > 0.004 ? 1 : 0));
  const characterLeft = useTransform(progress, (value) => `${characterPosition(value).left}%`);
  const characterTop = useTransform(progress, (value) => `${characterPosition(value).top}%`);
  // O personagem fica centrado no ponto da trilha (centro das molduras). O balão
  // fica acima dele; perto do topo do mapa, onde seria cortado, passa para baixo.
  const mapRef = useRef<HTMLDivElement>(null);
  const charRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLSpanElement>(null);
  const pillY = useTransform(progress, (value) => {
    const mapH = mapRef.current?.offsetHeight ?? 0;
    const charH = charRef.current?.offsetHeight ?? 0;
    const pillH = pillRef.current?.offsetHeight ?? 0;
    const roomAbove = (characterPosition(value).top / 100) * mapH - charH / 2;
    return roomAbove < pillH + PILL_GAP + 4 ? charH + pillH + PILL_GAP * 2 : 0;
  });
  const inCitadel = snapshot.territory === TERRITORIES.length - 1;
  const currentTerritory = TERRITORIES[snapshot.territory] ?? TERRITORIES[0];

  return (
    <section id="jornada" ref={sectionRef} className="lp-jr" aria-labelledby="lp-jornada-titulo">
      <div ref={headRef} className="lp-jr-head">
        <p className="lp-eyebrow">A jornada</p>
        <h2 id="lp-jornada-titulo" className="sp-display lp-jr-title">Um mapa que a turma percorre junto.</h2>
        <p className="lp-jr-lead">Três territórios, do básico ao avançado. Cada parada é um módulo de aulas, e a trilha mostra onde a turma está e o que vem depois.</p>
      </div>

      <div ref={pinRef} className="lp-jr-pin">
        <div ref={mapRef} className="lp-jr-map" aria-hidden="true">
          <svg viewBox="0 0 600 760" className="lp-jr-land">
            <path d="M-20 268 C 120 230, 220 300, 320 262 C 420 226, 520 270, 620 240 V 522 C 520 556, 440 504, 330 540 C 220 578, 100 512, -20 548 Z" fill="var(--sp-pink)" />
            <path d="M-20 548 C 100 512, 220 578, 330 540 C 440 504, 520 556, 620 522 V 780 H -20 Z" fill="var(--sp-blue)" />
            <circle cx="44" cy="44" r="38" fill="var(--sp-orange)" /><circle cx="104" cy="78" r="24" fill="var(--sp-orange)" />
            <circle cx="560" cy="200" r="30" fill="var(--sp-orange)" /><circle cx="516" cy="226" r="18" fill="var(--sp-orange)" />
            <ellipse cx="560" cy="430" rx="80" ry="40" fill="var(--sp-cream)" opacity=".45" /><ellipse cx="60" cy="440" rx="70" ry="30" fill="var(--sp-cream)" opacity=".45" />
            <g transform="translate(330 640) scale(1.7)"><path transform={SYMBOL_TRANSFORM} fill="var(--sp-cream)" opacity=".9" d={CROWN_PATH} /></g>
            <g transform="translate(-30 676) scale(1.1)"><path transform={SYMBOL_TRANSFORM} fill="var(--sp-cream)" opacity=".55" d={CROWN_PATH} /></g>
            <path className="lp-jr-fade" d="M-20 268 C 120 230, 220 300, 320 262 C 420 226, 520 270, 620 240 V 780 H -20 Z" fill="var(--sp-cream)" style={{ opacity: snapshot.territory === 0 ? 0.55 : 0 }} />
            <path className="lp-jr-fade" d="M-20 548 C 100 512, 220 578, 330 540 C 440 504, 520 556, 620 522 V 780 H -20 Z" fill="var(--sp-cream)" style={{ opacity: snapshot.territory === 1 ? 0.55 : 0 }} />
            <path d={JOURNEY_PATH} fill="none" stroke="var(--sp-black)" strokeWidth="8" strokeLinecap="round" strokeDasharray="0.1 18" />
            <motion.path d={JOURNEY_PATH} fill="none" stroke="var(--sp-black)" strokeWidth="14" strokeLinecap="round" strokeDasharray={`${JOURNEY_PATH_LENGTH} ${JOURNEY_PATH_LENGTH}`} style={{ strokeDashoffset: dashOffset, opacity: trailOpacity }} />
            <motion.path d={JOURNEY_PATH} fill="none" stroke="var(--sp-cream)" strokeWidth="7" strokeLinecap="round" strokeDasharray={`${JOURNEY_PATH_LENGTH} ${JOURNEY_PATH_LENGTH}`} style={{ strokeDashoffset: dashOffset, opacity: trailOpacity }} />
          </svg>

          {TERRITORIES.map((territory, index) => (
            <span key={territory.name} className={`lp-jr-stage${index === TERRITORIES.length - 1 && !inCitadel ? ' is-locked' : ''}`} style={{ top: `${territory.stageTop}%` }}>
              {territory.name}
            </span>
          ))}

          {JOURNEY_STOPS.map((stop, index) => {
            const state = snapshot.stops[index]?.state ?? 'next';
            return (
              <div key={stop.name} className={`lp-jr-node is-${state}`} style={{ left: `${stop.left}%`, top: `${stop.top}%` }}>
                <div className="lp-jr-pebble">
                  <svg className="lp-jr-shape" viewBox="-5 -5 169 154"><path transform={SYMBOL_TRANSFORM} d={PEBBLE_PATH} /></svg>
                  <img src={stop.image} alt="" />
                  {state === 'done' && <span className="lp-jr-badge"><Check size={14} strokeWidth={3.6} /></span>}
                  {state === 'locked' && <span className="lp-jr-badge is-locked"><Lock size={13} strokeWidth={3} /></span>}
                </div>
                <span className="lp-jr-label">{stop.name}<small>{snapshot.stops[index]?.caption}</small></span>
              </div>
            );
          })}

          <img className="lp-jr-flag" src={flagIcon} alt="" />

          <motion.div ref={charRef} className="lp-jr-char" style={{ left: characterLeft, top: characterTop }}>
            <motion.span ref={pillRef} className={`lp-jr-pill${inCitadel ? ' is-dark' : ''}`} style={{ x: '-50%', y: pillY }}>{snapshot.finished ? 'Fim da trilha' : 'Você está aqui'}</motion.span>
            <span className="lp-jr-char-slot" data-traveler="journey">
              <BrandCharacter
                className="lp-jr-char-art"
                body={inCitadel ? 'var(--sp-yellow)' : 'var(--sp-blue)'}
                face={inCitadel ? 'var(--sp-black)' : 'var(--sp-cream)'}
                expression={snapshot.finished ? 'happy' : 'open'}
                look={5}
                blink
                float
              />
            </span>
          </motion.div>
        </div>
        <div className="lp-jr-mob" aria-hidden="true">
          <strong>{currentTerritory.name}</strong>
          <span>Agora: {snapshot.current}</span>
          <TerritoryBar progress={progress} territory={currentTerritory} />
        </div>
      </div>

      <ol className="lp-jr-steps">
        {TERRITORIES.map((territory, index) => {
          const step = snapshot.steps[index];
          const state = step?.state ?? 'next';
          return (
            <li key={territory.name} className="lp-jr-step">
              <div className={`lp-step is-${state}${step?.locked ? ' is-locked' : ''}`}>
                <img src={territory.icon} alt="" />
                <div className="lp-step-copy">
                  <h3>
                    {territory.name}
                    {state === 'done' && <><Check className="lp-step-icon" size={18} strokeWidth={3} aria-hidden="true" /><span className="lp-sr">, concluído</span></>}
                    {step?.locked && <><Lock className="lp-step-icon is-locked" size={16} strokeWidth={2.6} aria-hidden="true" /><span className="lp-sr">, bloqueado</span></>}
                    {state === 'on' && <span className="lp-sr">, território atual</span>}
                  </h3>
                  <p>{territory.description}</p>
                  <TerritoryBar progress={progress} territory={territory} />
                  {state === 'on' && <div className="lp-jr-now">Agora: {snapshot.current}</div>}
                </div>
              </div>
              {index < TERRITORIES.length - 1 && <span className="lp-jr-link" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </section>
  );
}
