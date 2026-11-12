import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap } from 'lucide-react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { LANDING_GAMES } from './landing.data';
import type { LandingGame } from './landing.data';

const DEFAULT_GAME = 1;

function GameScene({ game, height, showXp }: { game: LandingGame; height: number; showXp?: boolean }) {
  return (
    <div className="lp-card-scene" style={{ height, background: `linear-gradient(135deg, ${game.scene[0]}, ${game.scene[1]})` }}>
      <img src={game.image} alt="" />
      <span className="lp-card-caption">{game.caption}</span>
      {showXp && <span className="lp-card-xp"><Zap size={13} fill="currentColor" aria-hidden="true" />{game.xp} XP</span>}
    </div>
  );
}

export function LandingMissions() {
  const [selected, setSelected] = useState(DEFAULT_GAME);
  const total = LANDING_GAMES.length;
  const game = LANDING_GAMES[selected] ?? LANDING_GAMES[0];
  const previous = LANDING_GAMES[(selected - 1 + total) % total] ?? game;
  const next = LANDING_GAMES[(selected + 1) % total] ?? game;

  return (
    <section id="jogos" className="lp-missions" aria-labelledby="lp-missoes-titulo">
      <div className="lp-missions-card">
        <img className="lp-missions-sticker" src={LANDING_GAMES[0].image} alt="" aria-hidden="true" />
        <div className="lp-missions-pal" aria-hidden="true" data-traveler="missions">
          <BrandCharacter body="var(--sp-yellow)" face="var(--sp-black)" eyes="var(--sp-yellow)" expression="happy" />
        </div>

        <div className="lp-missions-copy">
          <p className="lp-eyebrow lp-eyebrow--yellow">As missões</p>
          <h2 id="lp-missoes-titulo" className="sp-display lp-missions-title">Jogos que ensinam de verdade.</h2>
          <p className="lp-missions-lead">Cada jogo treina uma habilidade das aulas. A criança pratica e o educador acompanha o progresso.</p>
          <div className="lp-game-list" role="group" aria-label="Escolha um jogo para conhecer">
            {LANDING_GAMES.map((item, index) => (
              <button
                key={item.slug}
                type="button"
                className="lp-game-row"
                aria-pressed={index === selected}
                onClick={() => setSelected(index)}
              >
                <img src={item.image} alt="" />
                <span className="lp-game-row-copy"><strong>{item.title}</strong><span>{item.summary}</span></span>
                <em>{item.xp} XP</em>
              </button>
            ))}
          </div>
        </div>

        <div className="lp-missions-stage">
          <div className="lp-missions-deck">
            <div className="lp-card lp-card--side lp-card--left" aria-hidden="true"><GameScene game={previous} height={176} /></div>
            <div className="lp-card lp-card--side lp-card--right" aria-hidden="true"><GameScene game={next} height={176} /></div>
            <article className="lp-card lp-card--main" aria-live="polite">
              <GameScene game={game} height={186} showXp />
              <div className="lp-card-body">
                <h3>{game.title}</h3>
                <p>{game.description}</p>
                <Link to="/login" className="lp-card-btn">Começar missão</Link>
              </div>
            </article>
          </div>
          <p className="lp-eyebrow lp-eyebrow--yellow lp-notes-title">{game.notesTitle}</p>
          <ul className="lp-notes">
            {game.notes.map((note) => <li key={note}>{note}</li>)}
          </ul>
        </div>
      </div>
    </section>
  );
}
