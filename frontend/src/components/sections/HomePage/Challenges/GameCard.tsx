import { useState } from 'react';
import { Zap, Lock, Play } from 'lucide-react';
import type { GameCardData } from './games';

interface GameCardProps {
  game: GameCardData;
  onPlay: (game: GameCardData) => void;
}

// Card estilo Duolingo: thumbnail grande em destaque, corpo com titulo/descricao
// e botao solido com "sombra chapada" (efeito 3D press) na cor do jogo.
export function GameCard({ game, onPlay }: GameCardProps) {
  const [hover, setHover] = useState(false);
  const [imgError, setImgError] = useState(false);
  const disabled = game.status === 'SOON';

  return (
    <div
      className="rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] flex flex-col transition-transform duration-200"
      style={{
        transform: hover && !disabled ? 'translateY(-4px)' : 'none',
        boxShadow:
          hover && !disabled
            ? `0 10px 0 -2px ${game.colorDark}, 0 18px 30px -10px #000a`
            : '0 6px 0 -2px var(--border), 0 10px 20px -12px #000a',
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {/* thumbnail em destaque */}
      <div
        className="relative h-44 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.color}, ${game.colorDark})` }}
      >
        {!imgError ? (
          <img
            src={game.image}
            alt={game.title}
            draggable={false}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
            style={{ imageRendering: 'auto' }}
          />
        ) : (
          // fallback enquanto a arte nao existe
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-[var(--font-family-base)] text-white/80 text-2xl tracking-wide">
              {game.title}
            </span>
          </div>
        )}

        {/* badge XP */}
        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
          <Zap size={13} className="fill-[var(--accent)] text-[var(--accent)]" />
          <span className="text-xs text-white font-[var(--font-family-inter)] font-bold">
            {game.xp} XP
          </span>
        </div>

        {/* tag */}
        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
          <span className="text-[11px] text-white font-[var(--font-family-inter)]">
            {game.tag}
          </span>
        </div>

        {disabled && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex items-center gap-1.5 text-white/85">
              <Lock size={16} />
              <span className="text-sm font-[var(--font-family-inter)] font-semibold">
                Em breve
              </span>
            </div>
          </div>
        )}
      </div>

      {/* corpo */}
      <div className="flex-1 flex flex-col p-4">
        <h4 className="text-[var(--text-primary)] leading-tight mb-1">
          {game.title}
        </h4>
        <p className="text-[var(--text-secondary)] text-sm font-[var(--font-family-inter)] leading-snug mb-4">
          {game.description}
        </p>

        {/* botao estilo Duolingo (sombra solida, afunda ao clicar) */}
        <button
          type="button"
          disabled={disabled}
          onClick={() => !disabled && onPlay(game)}
          className="mt-auto w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-[var(--font-family-base)] text-lg tracking-wide text-white uppercase transition-all duration-100 active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: disabled ? 'var(--surface-alt)' : game.color,
            boxShadow: disabled ? 'none' : `0 4px 0 0 ${game.colorDark}`,
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
        >
          <Play size={16} className="fill-current" />
          {disabled ? 'Bloqueado' : 'Jogar'}
        </button>
      </div>
    </div>
  );
}
