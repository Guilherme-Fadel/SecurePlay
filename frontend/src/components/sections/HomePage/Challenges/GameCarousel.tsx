import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Lock, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { GameCardData } from './games';

interface GameCarouselProps {
  games: GameCardData[];
  onPlay: (game: GameCardData) => void;
  // slug do jogo que deve iniciar em foco (ex.: ao voltar de um jogo). Opcional.
  initialSlug?: string | null;
  // reporta o slug do jogo em foco ao mudar, para o pai preservar a posicao.
  onFocusChange?: (slug: string) => void;
}

/**
 * Carrossel de selecao de jogo estilo "arcade": o card central fica em foco
 * (tamanho cheio, jogavel) e os laterais aparecem menores e esmaecidos.
 * Navegacao por setas, teclado, arraste horizontal e clique nos cards laterais.
 */
export function GameCarousel({ games, onPlay, initialSlug, onFocusChange }: GameCarouselProps) {
  const total = games.length;

  const clamp = useCallback(
    (i: number) => Math.max(0, Math.min(Math.max(0, total - 1), i)),
    [total],
  );

  // inicia no jogo indicado por initialSlug (se existir), senao no primeiro.
  const [index, setIndex] = useState(() => {
    if (!initialSlug) return 0;
    const found = games.findIndex((g) => g.id === initialSlug);
    return found >= 0 ? found : 0;
  });

  // Muda o foco e reporta ao pai numa unica acao (evita loop de efeitos).
  // Nao chama onFocusChange dentro de useEffect, apenas em resposta a acao do usuario.
  const focusIndex = useCallback(
    (next: number) => {
      const clamped = clamp(next);
      setIndex(clamped);
      const g = games[clamped];
      if (g) onFocusChange?.(g.id);
    },
    [clamp, games, onFocusChange],
  );

  // Realinha o foco pelo slug SOMENTE quando o slug pedido muda e diverge do foco atual
  // (ex.: catalogo da API chega depois). A guarda impede o ciclo com onFocusChange.
  useEffect(() => {
    if (!initialSlug) return;
    const found = games.findIndex((g) => g.id === initialSlug);
    if (found >= 0 && found !== index) {
      setIndex(found);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSlug, games]);

  const go = useCallback(
    (delta: number) => focusIndex(index + delta),
    [focusIndex, index],
  );

  // Navegacao por teclado quando o carrossel esta em foco.
  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        go(-1);
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        go(1);
      }
    };
    node.addEventListener('keydown', onKey);
    return () => node.removeEventListener('keydown', onKey);
  }, [go]);

  const focused = games[index];

  return (
    <div className="flex flex-col items-center">
      {/* linha: seta esquerda | palco | seta direita */}
      <div className="flex items-center gap-3 sm:gap-6">
        <button
          type="button"
          aria-label="Jogo anterior"
          onClick={() => go(-1)}
          disabled={index === 0}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-primary)] shadow-lg transition-opacity hover:border-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronLeft size={22} />
        </button>

        {/* palco do carrossel */}
        <div
          ref={containerRef}
          tabIndex={0}
          role="listbox"
          aria-label="Selecao de jogos"
          aria-activedescendant={`game-${focused?.id}`}
          className="relative w-[320px] sm:w-[560px] lg:w-[720px] h-[420px] flex items-center justify-center outline-none select-none"
          style={{
            WebkitMaskImage:
              'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            maskImage:
              'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
          }}
        >
          {/* trilho arrastavel: converte o arraste em troca de card */}
          <motion.div
            className="absolute inset-0 flex items-center justify-center"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.18}
            onDragEnd={(_, info) => {
              if (info.offset.x < -60) go(1);
              else if (info.offset.x > 60) go(-1);
            }}
          >
            {games.map((game, i) => {
              const offset = i - index;
              const isFocused = offset === 0;
              const abs = Math.abs(offset);

              // cards muito distantes nao sao renderizados como visiveis
              if (abs > 2) return null;

              return (
                <motion.div
                  key={game.id}
                  id={`game-${game.id}`}
                  role="option"
                  aria-selected={isFocused}
                  className="absolute"
                  initial={false}
                  animate={{
                    x: offset * 300,
                    scale: isFocused ? 1 : 0.8 - (abs - 1) * 0.06,
                    opacity: isFocused ? 1 : 0.4 - (abs - 1) * 0.15,
                    zIndex: 10 - abs,
                    filter: isFocused ? 'blur(0px)' : 'blur(1px)',
                  }}
                  transition={{ type: 'spring', stiffness: 260, damping: 30 }}
                  onClick={() => !isFocused && focusIndex(i)}
                  style={{ cursor: isFocused ? 'default' : 'pointer' }}
                >
                  <CarouselCard
                    game={game}
                    focused={isFocused}
                    onPlay={onPlay}
                  />
                </motion.div>
              );
            })}
          </motion.div>
        </div>

        <button
          type="button"
          aria-label="Proximo jogo"
          onClick={() => go(1)}
          disabled={index === total - 1}
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-full bg-[var(--surface)] border-2 border-[var(--border)] text-[var(--text-primary)] shadow-lg transition-opacity hover:border-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
        >
          <ChevronRight size={22} />
        </button>
      </div>

      {/* indicadores (bolinhas) */}
      <div className="flex items-center gap-2 mt-6">
        {games.map((game, i) => (
          <button
            key={game.id}
            type="button"
            aria-label={`Ir para ${game.title}`}
            onClick={() => focusIndex(i)}
            className="h-2.5 rounded-full transition-all cursor-pointer"
            style={{
              width: i === index ? 26 : 10,
              background:
                i === index ? 'var(--primary)' : 'var(--border-light)',
            }}
          />
        ))}
      </div>
    </div>
  );
}

interface CarouselCardProps {
  game: GameCardData;
  focused: boolean;
  onPlay: (game: GameCardData) => void;
}

// Card do carrossel: reaproveita o visual do GameCard (thumbnail + corpo),
// mas o botao Jogar so e acionavel quando o card esta em foco no centro.
function CarouselCard({ game, focused, onPlay }: CarouselCardProps) {
  const [imgError, setImgError] = useState(false);
  const disabled = game.status === 'SOON';

  return (
    <div
      className="w-72 rounded-3xl overflow-hidden bg-[var(--surface)] border border-[var(--border)] flex flex-col"
      style={{
        boxShadow: focused
          ? `0 12px 0 -2px ${game.colorDark}, 0 22px 40px -12px #000a`
          : '0 6px 0 -2px var(--border), 0 10px 20px -12px #000a',
      }}
    >
      <div
        className="relative h-48 overflow-hidden"
        style={{ background: `linear-gradient(135deg, ${game.color}, ${game.colorDark})` }}
      >
        {!imgError ? (
          <img
            src={game.image}
            alt={game.title}
            draggable={false}
            onError={() => setImgError(true)}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="font-[var(--font-family-base)] text-white/80 text-2xl tracking-wide">
              {game.title}
            </span>
          </div>
        )}

        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
          <Zap size={13} className="fill-[var(--accent)] text-[var(--accent)]" />
          <span className="text-xs text-white font-[var(--font-family-inter)] font-bold">
            {game.xp} XP
          </span>
        </div>

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

      <div className="flex-1 flex flex-col p-4">
        <h4 className="text-[var(--text-primary)] leading-tight mb-1">
          {game.title}
        </h4>
        <p className="text-[var(--text-secondary)] text-sm font-[var(--font-family-inter)] leading-snug mb-4">
          {game.description}
        </p>

        <button
          type="button"
          disabled={disabled || !focused}
          onClick={() => focused && !disabled && onPlay(game)}
          className="mt-auto w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-[var(--font-family-base)] text-lg tracking-wide text-white uppercase transition-all duration-100 active:translate-y-[3px] active:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: disabled ? 'var(--surface-alt)' : game.color,
            boxShadow: disabled ? 'none' : `0 4px 0 0 ${game.colorDark}`,
            cursor: disabled || !focused ? 'not-allowed' : 'pointer',
          }}
        >
          <Play size={16} className="fill-current" />
          {disabled ? 'Bloqueado' : 'Jogar'}
        </button>
      </div>
    </div>
  );
}
