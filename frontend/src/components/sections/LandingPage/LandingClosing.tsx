import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { BrandMark } from '@/components/shared/BrandMark';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import type { BrandCharacterProps } from '@/components/shared/BrandCharacter';
import { CONTACT_EMAIL } from './landing.data';

const MAILTO = `mailto:${CONTACT_EMAIL}`;

/** A turma do rodapé: o símbolo nas cores da paleta, cada um com um jeito. */
const CREW: Array<BrandCharacterProps & { tilt: number }> = [
  { body: 'var(--sp-yellow)', face: 'var(--sp-pink)', eyes: 'var(--sp-yellow)', tilt: -8 },
  { body: 'var(--sp-orange)', face: 'var(--sp-yellow)', eyes: 'var(--sp-orange)', expression: 'happy', tilt: 6 },
  { body: 'var(--sp-black)', face: 'var(--sp-cream)', eyes: 'var(--sp-black)', faceRotation: -90, tilt: -4 },
  { body: 'var(--sp-pink)', face: 'var(--sp-cream)', eyes: 'var(--sp-pink)', look: 5, lift: -3, tilt: 9 },
  { body: 'var(--sp-red)', face: 'var(--sp-pink)', eyes: 'var(--sp-red)', faceRotation: 180, tilt: -10 },
  { body: 'var(--sp-cream)', face: 'var(--sp-blue)', eyes: 'var(--sp-cream)', expression: 'wink', tilt: 4 },
];

export function LandingSchools() {
  return (
    <section id="escolas" className="lp-schools" aria-labelledby="lp-escolas-titulo">
      <div className="lp-schools-inner">
        {/* Arte da marca no lugar da foto até haver imagem com autorização de uso. */}
        <figure className="lp-schools-frame" aria-hidden="true">
          <div className="lp-schools-art">
            <BrandCharacter className="lp-schools-art-main" body="var(--sp-blue)" face="var(--sp-cream)" expression="happy" />
            <BrandCharacter className="lp-schools-art-peek" body="var(--sp-yellow)" face="var(--sp-black)" eyes="var(--sp-yellow)" look={-4} blink />
            <BrandCharacter className="lp-schools-art-small" body="var(--sp-pink)" face="var(--sp-cream)" eyes="var(--sp-pink)" look={5} />
          </div>
        </figure>
        <div className="lp-schools-copy">
          <p className="lp-eyebrow">Para escolas e educadores</p>
          <h2 id="lp-escolas-titulo" className="sp-display lp-schools-title">A conversa<br />continua<br /><span>na escola.</span></h2>
          <p className="lp-schools-lead">Uma proposta para transformar o cuidado digital em tema de participação, troca e aprendizado na rotina da turma.</p>
          <a href={MAILTO} className="lp-btn lp-btn--dark">
            Conversar com a equipe <ArrowUpRight size={18} strokeWidth={2.8} aria-hidden="true" />
          </a>
        </div>
      </div>
    </section>
  );
}

function PlayStrip() {
  return (
    <p className="sp-display lp-play-strip" aria-hidden="true">
      {Array.from({ length: 5 }, (_, index) => <span key={index}>Dê o play →<sup>®</sup></span>)}
    </p>
  );
}

export function LandingPlay() {
  return (
    <section className="lp-play" aria-labelledby="lp-play-titulo">
      <PlayStrip />
      <div className="lp-play-body">
        <div className="lp-play-mascot" data-traveler="play"><BrandCharacter body="var(--sp-yellow)" face="var(--sp-black)" eyes="var(--sp-yellow)" expression="happy" float /></div>
        <h2 id="lp-play-titulo" className="sp-display lp-play-title">Não tem mais fase por aqui. <span>Hora de começar a aventura.</span></h2>
        <div className="lp-play-actions">
          <Link to="/teste-gratuito" className="lp-btn lp-btn--chunky">Teste grátis por 7 dias</Link>
          <a href={MAILTO} className="lp-link-light">Falar com a equipe</a>
        </div>
      </div>
      <PlayStrip />
    </section>
  );
}

export function LandingFooter() {
  return (
    <footer className="lp-footer">
      <div className="lp-footer-crew" aria-hidden="true">
        {CREW.map(({ tilt, ...character }, index) => (
          <div key={index} className="lp-footer-pal" style={{ transform: `rotate(${tilt}deg)` }}>
            <BrandCharacter {...character} />
          </div>
        ))}
      </div>
      <div className="lp-footer-main">
        <div className="lp-footer-brand">
          <BrandMark variant="horizontal" tone="cream" />
          <p>Aprender a navegar com mais segurança, juntos.</p>
        </div>
        <nav className="lp-footer-col" aria-label="Plataforma">
          <strong>Plataforma</strong>
          <a href="#jornada">A jornada</a>
          <a href="#jogos">Jogos</a>
          <Link to="/login">Entrar</Link>
        </nav>
        <nav className="lp-footer-col" aria-label="Escolas">
          <strong>Escolas</strong>
          <Link to="/teste-gratuito">Teste grátis</Link>
          <a href={MAILTO}>Falar com a equipe</a>
        </nav>
        <nav className="lp-footer-col" aria-label="Políticas">
          <strong>Políticas</strong>
          <Link to="/privacidade">Privacidade</Link>
          <Link to="/termos">Termos</Link>
        </nav>
      </div>
      <div className="lp-footer-legal">© 2026 SecurePlay. Segurança digital para escolas.</div>
    </footer>
  );
}
