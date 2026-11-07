import { useState, type CSSProperties } from 'react';
import { LockKeyhole } from 'lucide-react';
import { spendsToken, type GameCardData } from './games';
import { deckToneFor, isPixelArt } from './gameDeckTheme';
import { cardNumber, poseTransform, type CardPose } from './gameDeckLayout';

interface GameDeckFaceProps {
  game: GameCardData;
  index: number;
  total: number;
}

function footNote(game: GameCardData): string | null {
  if (game.status === 'SOON') return 'Em breve';
  return spendsToken(game) ? null : 'Não usa ficha';
}

/** Frente da carta: faixa colorida por slug, XP, arte pixel, tag, número e texto. */
export function GameDeckFace({ game, index, total }: GameDeckFaceProps) {
  const [artFailed, setArtFailed] = useState(false);
  const showArt = Boolean(game.image) && !artFailed;
  const note = footNote(game);
  return (
    <div className="dk-face" data-tone={deckToneFor(game.id)}>
      <div className="dk-frame">
        <div className="dk-band">
          <h3 className="dk-display">{game.title}</h3>
          <span className="dk-gem">{game.xp}<small> XP</small></span>
        </div>
        <div className="dk-window">
          {showArt ? (
            <img
              src={game.image}
              alt=""
              width={126}
              height={126}
              draggable={false}
              className={isPixelArt(game.image) ? 'is-pixel' : undefined}
              onError={() => setArtFailed(true)}
            />
          ) : (
            <span className="dk-art-fallback" aria-hidden="true">{game.tag}</span>
          )}
          {game.status === 'SOON' && (
            <span className="dk-soon"><LockKeyhole size={18} aria-hidden="true" />Em breve</span>
          )}
        </div>
        <p className="dk-type"><span>{game.tag}</span><span>{cardNumber(index, total)}</span></p>
        <p className="dk-text">{game.description}</p>
        {note && <p className="dk-foot"><span>{note}</span></p>}
      </div>
      <span className="dk-holo" aria-hidden="true" />
    </div>
  );
}

interface GameDeckSlotProps {
  game: GameCardData;
  index: number;
  total: number;
  pose: CardPose;
  front: boolean;
  dealClass: string | null;
  launching: boolean;
  onPick: (index: number) => void;
}

/** Posição da carta na mão. Cartas de trás viram botões "Trazer … para frente". */
export function GameDeckSlot({ game, index, total, pose, front, dealClass, launching, onPick }: GameDeckSlotProps) {
  const classes = ['dk-slot'];
  if (front) classes.push('is-front');
  if (front && launching) classes.push('is-launching');
  if (pose.hidden) classes.push('is-hidden');
  if (dealClass) classes.push(dealClass);
  const style: CSSProperties = {
    transform: poseTransform(pose),
    zIndex: pose.z,
    animationDelay: dealClass ? `${Math.min(index * 0.12, 0.72)}s` : undefined,
  };
  return (
    <div className={classes.join(' ')} style={style}>
      <div className="dk-tilt" aria-hidden={front ? undefined : true}>
        <GameDeckFace game={game} index={index} total={total} />
      </div>
      {!front && !pose.hidden && (
        <button
          type="button"
          className="dk-pick"
          aria-label={`Trazer ${game.title} para frente`}
          disabled={launching}
          onClick={() => onPick(index)}
        />
      )}
    </div>
  );
}
