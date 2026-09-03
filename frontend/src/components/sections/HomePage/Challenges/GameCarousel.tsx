import { useState, useEffect, useRef, useCallback } from 'react';
import { Zap, Lock, Play, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion } from 'motion/react';
import type { GameCardData } from './games';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppButton } from '@/components/ui/buttons/AppButton';
interface GameCarouselProps {
    games: GameCardData[];
    onPlay: (game: GameCardData) => void;
    initialSlug?: string | null;
    onFocusChange?: (slug: string) => void;
}
export function GameCarousel({ games, onPlay, initialSlug, onFocusChange }: GameCarouselProps) {
    const total = games.length;
    const normalizeIndex = useCallback((next: number) => total > 0 ? ((next % total) + total) % total : 0, [total]);
    const getCircularOffset = useCallback((gameIndex: number, focusedIndex: number) => {
        if (total <= 1)
            return 0;
        let offset = gameIndex - focusedIndex;
        const halfway = total / 2;
        if (offset > halfway)
            offset -= total;
        if (offset < -halfway)
            offset += total;
        return offset;
    }, [total]);
    const [index, setIndex] = useState(() => {
        if (!initialSlug)
            return 0;
        const found = games.findIndex((g) => g.id === initialSlug);
        return found >= 0 ? found : 0;
    });
    const focusIndex = useCallback((next: number) => {
        const normalized = normalizeIndex(next);
        setIndex(normalized);
        const g = games[normalized];
        if (g)
            onFocusChange?.(g.id);
    }, [games, normalizeIndex, onFocusChange]);
    useEffect(() => {
        if (!initialSlug)
            return;
        const found = games.findIndex((g) => g.id === initialSlug);
        if (found >= 0 && found !== index) {
            setIndex(found);
        }
    }, [initialSlug, games]);
    useEffect(() => {
        setIndex((current) => normalizeIndex(current));
    }, [normalizeIndex]);
    const go = useCallback((delta: number) => focusIndex(index + delta), [focusIndex, index]);
    const containerRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const node = containerRef.current;
        if (!node)
            return;
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                go(-1);
            }
            else if (e.key === 'ArrowRight') {
                e.preventDefault();
                go(1);
            }
        };
        node.addEventListener('keydown', onKey);
        return () => node.removeEventListener('keydown', onKey);
    }, [go]);
    const focused = games[index];
    return (<div className="challenge-carousel flex flex-col items-center">

      <div className="flex items-center gap-3 sm:gap-6">
        <AppButton aria-label="Jogo anterior" onClick={() => go(-1)} disabled={total <= 1} variant="ghost" icon={<ChevronLeft size={20}/>} className="app-icon-button shrink-0"/>


        <div ref={containerRef} tabIndex={0} role="listbox" aria-label="Selecao de jogos" aria-activedescendant={`game-${focused?.id}`} className="challenge-carousel-stage relative w-[320px] sm:w-[560px] lg:w-[720px] h-[420px] flex items-center justify-center outline-none select-none" style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        }}>

          <motion.div className="absolute inset-0 flex items-center justify-center" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.18} onDragEnd={(_, info) => {
            if (info.offset.x < -60)
                go(1);
            else if (info.offset.x > 60)
                go(-1);
        }}>
            {games.map((game, i) => {
            const offset = getCircularOffset(i, index);
            const isFocused = offset === 0;
            const abs = Math.abs(offset);
            if (abs > 2)
                return null;
            return (<motion.div key={game.id} id={`game-${game.id}`} role="option" aria-selected={isFocused} className="absolute" initial={false} animate={{
                    x: offset * 300,
                    scale: isFocused ? 1 : 0.8 - (abs - 1) * 0.06,
                    opacity: isFocused ? 1 : 0.4 - (abs - 1) * 0.15,
                    zIndex: 10 - abs,
                    filter: isFocused ? 'blur(0px)' : 'blur(1px)',
                }} transition={{ type: 'spring', stiffness: 260, damping: 30 }} onClick={() => !isFocused && focusIndex(i)} style={{ cursor: isFocused ? 'default' : 'pointer' }}>
                  <CarouselCard game={game} focused={isFocused} onPlay={onPlay}/>
                </motion.div>);
        })}
          </motion.div>
        </div>

        <AppButton aria-label="Proximo jogo" onClick={() => go(1)} disabled={total <= 1} variant="ghost" icon={<ChevronRight size={20}/>} className="app-icon-button shrink-0"/>
      </div>


      <div className="challenge-carousel-pagination">
        <span>{index + 1} de {total}</span>
        <div className="flex items-center gap-2">
        {games.map((game, i) => (<button key={game.id} type="button" aria-label={`Ir para ${game.title}`} onClick={() => focusIndex(i)} className="h-2.5 rounded-full transition-all cursor-pointer" style={{
                width: i === index ? 26 : 10,
                background: i === index ? 'var(--primary)' : 'var(--border-light)',
            }}/>))}
        </div>
      </div>
    </div>);
}
interface CarouselCardProps {
    game: GameCardData;
    focused: boolean;
    onPlay: (game: GameCardData) => void;
}
function CarouselCard({ game, focused, onPlay }: CarouselCardProps) {
    const [imgError, setImgError] = useState(false);
    const disabled = game.status === 'SOON';
    return (<InfoCard raised className={`app-game-card w-72 overflow-hidden flex flex-col ${focused ? 'is-focused' : ''}`}>
      <div className="relative h-48 overflow-hidden" style={{ background: `linear-gradient(135deg, ${game.color}, ${game.colorDark})` }}>
        {!imgError ? (<img src={game.image} alt={game.title} draggable={false} onError={() => setImgError(true)} className={`w-full h-full object-cover ${game.image.endsWith('-pixel.png') ? 'challenge-pixel-art' : ''}`}/>) : (<div className="w-full h-full flex items-center justify-center">
            <span className="font-[var(--font-family-base)] text-white/80 text-2xl tracking-wide">
              {game.title}
            </span>
          </div>)}

        <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
          <Zap size={13} className="fill-[var(--accent)] text-[var(--accent)]"/>
          <span className="text-xs text-white font-[var(--font-family-inter)] font-bold">
            {game.xp} XP
          </span>
        </div>

        <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/55 backdrop-blur-sm">
          <span className="text-[11px] text-white font-[var(--font-family-inter)]">
            {game.tag}
          </span>
        </div>

        {disabled && (<div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="flex items-center gap-1.5 text-white/85">
              <Lock size={16}/>
              <span className="text-sm font-[var(--font-family-inter)] font-semibold">
                Em breve
              </span>
            </div>
          </div>)}
      </div>

      <div className="flex-1 flex flex-col p-4">
        <h4 className="text-[var(--text-primary)] leading-tight mb-1">
          {game.title}
        </h4>
        <p className="text-[var(--text-secondary)] text-sm font-[var(--font-family-inter)] leading-snug mb-4">
          {game.description}
        </p>

        <AppButton disabled={disabled || !focused} onClick={() => focused && !disabled && onPlay(game)} variant="primary" icon={<Play size={15}/>} className="mt-auto w-full">
          {disabled ? 'Bloqueado' : 'Jogar'}
        </AppButton>
      </div>
    </InfoCard>);
}
