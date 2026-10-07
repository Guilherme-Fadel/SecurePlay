import { useState, useEffect, useRef, useCallback } from 'react';
import { ChevronLeft, ChevronRight, LockKeyhole, Zap } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import type { GameCardData } from './games';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';
interface GameCarouselProps {
    games: GameCardData[];
    onPlay: (game: GameCardData) => void;
    initialSlug?: string | null;
    onFocusChange?: (slug: string) => void;
}
export function GameCarousel({ games, onPlay, initialSlug, onFocusChange }: GameCarouselProps) {
    const shouldReduceMotion = useReducedMotion();
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
    return (<div className="challenge-carousel flex flex-col items-center">

      <div className="flex items-center gap-3 sm:gap-6">
        <AppButton aria-label="Jogo anterior" onClick={() => go(-1)} disabled={total <= 1} variant="ghost" icon={<ChevronLeft size={20}/>} className="app-icon-button shrink-0"/>


        <div ref={containerRef} tabIndex={0} role="group" aria-roledescription="carrossel" aria-label="Jogos disponíveis. Use as setas esquerda e direita para navegar." aria-keyshortcuts="ArrowLeft ArrowRight" className="challenge-carousel-stage relative w-[320px] sm:w-[560px] lg:w-[720px] h-[420px] flex items-center justify-center outline-none select-none" style={{
            WebkitMaskImage: 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
            maskImage: 'linear-gradient(to right, transparent 0%, #000 22%, #000 78%, transparent 100%)',
        }}>

          <motion.div className="absolute inset-0 flex items-center justify-center" drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.08} onDragEnd={(_, info) => {
            if (info.offset.x < -60)
                go(1);
            else if (info.offset.x > 60)
                go(-1);
        }}>
            <AnimatePresence initial={false}>
            {games.map((game, i) => {
            const offset = getCircularOffset(i, index);
            const isFocused = offset === 0;
            const abs = Math.abs(offset);
            if (abs > 1)
                return null;
            return (<motion.div key={game.id} id={`game-${game.id}`} aria-hidden={!isFocused} className="challenge-carousel-item absolute" initial={shouldReduceMotion ? false : { opacity: 0 }} animate={{
                    x: offset * 300,
                    scale: isFocused ? 1 : 0.8,
                    opacity: isFocused ? 1 : 0.48,
                    zIndex: 10 - abs,
                    filter: 'blur(0px)',
                }} exit={{ opacity: 0, transition: { duration: shouldReduceMotion ? 0 : 0.2 } }} transition={shouldReduceMotion ? { duration: 0 } : { type: 'tween', duration: 0.95, ease: [0.25, 0.8, 0.25, 1] }} onClick={() => !isFocused && focusIndex(i)} style={{ cursor: isFocused ? 'default' : 'pointer' }}>
                  <CarouselCard game={game} focused={isFocused} onPlay={onPlay}/>
                </motion.div>);
        })}
            </AnimatePresence>
          </motion.div>
        </div>

        <AppButton aria-label="Proximo jogo" onClick={() => go(1)} disabled={total <= 1} variant="ghost" icon={<ChevronRight size={20}/>} className="app-icon-button shrink-0"/>
      </div>


      <div className="challenge-carousel-pagination">
        <span aria-live="polite" aria-atomic="true">{index + 1} de {total}</span>
        <div className="flex items-center gap-2">
        {games.map((game, i) => (<button key={game.id} type="button" aria-label={`Ir para ${game.title}`} aria-current={i === index ? 'true' : undefined} onClick={() => focusIndex(i)} className="challenge-carousel-dot"/>))}
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
    const cardCopy: Record<string, { tag: string; description: string }> = {
        'quiz-relampago': { tag: 'Desafio rápido', description: 'Responda às charadas antes que o tempo acabe.' },
        'caca-phishing': { tag: 'Correio misterioso', description: 'Leia os recados e descubra quais são seguros.' },
        'classificacao-dados': { tag: 'Arquivo do castelo', description: 'Escolha quem pode conhecer cada segredo.' },
        termotech: { tag: 'Palavra secreta', description: 'Use as pistas para descobrir a palavra.' },
    };
    const copy = cardCopy[game.id] ?? { tag: game.tag, description: game.description };
    return (<InfoCard raised className={`app-game-card challenge-card--${game.id} w-72 overflow-hidden flex flex-col ${focused ? 'is-focused' : ''}`}>
      <div className="challenge-card-scene relative overflow-hidden" style={{ background: `linear-gradient(135deg, ${game.color}, ${game.colorDark})` }}>
        {!imgError && game.image ? (<ProgressiveImage src={game.image} alt="" aria-hidden="true" draggable={false} onError={() => setImgError(true)} className={`w-full h-full object-cover ${game.image.endsWith('-pixel.png') ? 'challenge-pixel-art' : ''}`}/>) : (<div className="challenge-card-art-fallback" aria-hidden="true">{copy.tag}</div>)}

        <div className="challenge-card-scene-caption" aria-hidden="true">
          <span>{copy.tag}</span>
        </div>

        <div className="challenge-card-xp"><Zap size={13} aria-hidden="true"/><span>{game.xp} XP</span></div>

        {disabled && (<div className="challenge-card-locked"><LockKeyhole size={19}/><span>Em breve</span></div>)}
      </div>

      <div className="challenge-card-copy">
        <div className="challenge-card-title-row"><h4>
          {game.title}
        </h4></div>
        <p>
          {copy.description}
        </p>

        <AppButton disabled={disabled || !focused} onClick={() => focused && !disabled && onPlay(game)} variant="primary" className="challenge-card-play">
          {disabled ? 'Em breve' : focused ? 'Começar missão' : 'Escolher missão'}
        </AppButton>
      </div>
    </InfoCard>);
}
