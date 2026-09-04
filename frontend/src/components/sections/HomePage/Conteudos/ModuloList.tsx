import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useConteudos } from '@/hooks/useConteudos';
import { Modulo } from '@/services/conteudo';
import { ModuloCard } from './ModuloCard';
import { SkeletonList } from './SkeletonCard';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useMissionRoomAssets } from '@/hooks/useMissionRoomAssets';
import { ProgressiveImage } from '@/components/ui/visuals/ProgressiveImage';

interface ModuloListProps { onSelectModulo: (moduloId: number) => void; }
type Difficulty = Modulo['difficulty'];
type SlideDirection = 'next' | 'prev';

const moduleCardVariants = {
  enter: (direction: SlideDirection) => ({ opacity: 0, x: direction === 'next' ? 72 : -72 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: SlideDirection) => ({ opacity: 0, x: direction === 'next' ? -72 : 72 }),
};

const levels: Array<{ key: Difficulty; name: string; eyebrow: string; description: string; artKey: string }> = [
  { key: 'iniciante', name: 'Nível Fácil', eyebrow: 'COMECE SUA JORNADA', description: 'Aprenda os primeiros poderes para explorar a internet com segurança.', artKey: 'level-easy' },
  { key: 'intermediario', name: 'Nível Médio', eyebrow: 'NOVOS DESAFIOS', description: 'Use o que você aprendeu para resolver missões mais desafiadoras.', artKey: 'level-medium' },
  { key: 'avancado', name: 'Nível Difícil', eyebrow: 'MISSÕES DE MESTRE', description: 'Enfrente os desafios finais e torne-se um guardião digital.', artKey: 'level-hard' },
];

const statusFilters = [
  { key: 'todos', label: 'Todas' },
  { key: 'em_progresso', label: 'Em andamento' },
  { key: 'concluidos', label: 'Concluídas' },
] as const;

export function ModuloList({ onSelectModulo }: ModuloListProps) {
  const { modulos, allModulos: queriedModulos, loading, filterStatus, setFilterStatus } = useConteudos();
  const assets = useMissionRoomAssets();
  const prefersReducedMotion = useReducedMotion();
  const [levelIndex, setLevelIndex] = useState(0);
  const [carouselStart, setCarouselStart] = useState(0);
  const [levelSlideDirection, setLevelSlideDirection] = useState<SlideDirection>('next');
  const [carouselDirection, setCarouselDirection] = useState<SlideDirection>('next');
  const level = levels[levelIndex];
  const allModulos = queriedModulos ?? [];
  const levelAllModules = useMemo(() => allModulos.filter((modulo) => modulo.difficulty === level.key), [allModulos, level.key]);
  const levelModules = useMemo(() => modulos.filter((modulo) => modulo.difficulty === level.key), [modulos, level.key]);
  const totalLessons = levelAllModules.reduce((total, modulo) => total + modulo.totalAulas, 0);
  const completedLessons = levelAllModules.reduce((total, modulo) => total + modulo.completedAulas, 0);
  const availableXp = levelAllModules.reduce((total, modulo) => total + modulo.xp_total + modulo.xp_bonus, 0);
  const completedModules = levelAllModules.filter((modulo) => modulo.progress === 100).length;
  const nextModule = levelAllModules.find((modulo) => modulo.hasStarted && modulo.progress < 100)
    ?? levelAllModules.find((modulo) => modulo.progress < 100)
    ?? levelAllModules[0];
  const changeLevel = (direction: number) => {
    setLevelSlideDirection(direction > 0 ? 'next' : 'prev');
    setCarouselStart(0);
    setLevelIndex((current) => (current + direction + levels.length) % levels.length);
  };
  const selectLevel = (index: number) => {
    if (index === levelIndex) return;
    setLevelSlideDirection(index > levelIndex ? 'next' : 'prev');
    setCarouselStart(0);
    setLevelIndex(index);
  };
  const visibleModules = levelModules.slice(carouselStart, carouselStart + 3);
  const carouselMax = Math.max(0, levelModules.length - 3);

  useEffect(() => setCarouselStart(0), [filterStatus]);

  if (loading || !assets['missions-room-emblem']) return <div className="app-page flex flex-col gap-6"><SkeletonList /></div>;

  return (
    <div className="app-page missions-room-page">
      <header className="missions-room-title">
        <ProgressiveImage src={assets['missions-room-emblem']} alt="" />
        <div><h1>Sala de Missões</h1><p>Escolha um nível, complete missões e torne-se um guardião digital!</p></div>
        <div className="missions-room-total-xp"><ProgressiveImage src={assets['icon-star']} alt="" /><strong>{allModulos.reduce((total, modulo) => total + modulo.xp_total + modulo.xp_bonus, 0)}</strong><span>XP disponíveis</span></div>
      </header>

      <section className="missions-room-stage" style={{ '--missions-room-bg': `url(${assets['castle-library-bg']})` } as React.CSSProperties}>
        <button className="missions-level-arrow is-left" type="button" onClick={() => changeLevel(-1)} aria-label="Ver nível anterior"><ChevronLeft size={30} /></button>
        <div className={`missions-level-board slide-${levelSlideDirection}`} key={level.key}>
          <div className="missions-level-art"><ProgressiveImage src={assets[level.artKey]} alt="" /></div>
          <div className="missions-level-copy">
            <span>{level.eyebrow}</span><h2>{level.name}</h2><p>{level.description}</p>
            <div className="missions-level-metrics">
              <div><ProgressiveImage src={assets['icon-book']} alt="" /><strong>{levelAllModules.length}</strong><span>módulos</span></div>
              <div><ProgressiveImage src={assets['icon-flag']} alt="" /><strong>{totalLessons}</strong><span>aulas</span></div>
              <div><ProgressiveImage src={assets['icon-star']} alt="" /><strong>{availableXp}</strong><span>XP</span></div>
            </div>
            <AppButton disabled={!nextModule} icon={<Play size={17} />} onClick={() => nextModule && onSelectModulo(nextModule.id)}>{nextModule?.hasStarted || (nextModule?.progress ?? 0) > 0 ? 'Continuar aventura' : 'Começar aventura'}</AppButton>
          </div>
          <div className="missions-level-progress"><span>Progresso do nível</span><strong>{completedModules}/{levelAllModules.length}</strong><div><i style={{ width: `${levelAllModules.length ? (completedModules / levelAllModules.length) * 100 : 0}%` }} /></div><small>{completedLessons} de {totalLessons} aulas</small></div>
        </div>
        <button className="missions-level-arrow is-right" type="button" onClick={() => changeLevel(1)} aria-label="Ver próximo nível"><ChevronRight size={30} /></button>
        <div className="missions-level-dots" aria-label={`Nível ${levelIndex + 1} de ${levels.length}`}>{levels.map((item, index) => <button key={item.key} type="button" className={index === levelIndex ? 'is-active' : ''} onClick={() => selectLevel(index)} aria-label={item.name} />)}</div>
      </section>

      <section className="missions-shelf-section">
        <div className="missions-shelf-heading"><div><span>MISSÕES DO NÍVEL</span><h2>{level.name}</h2></div><p>{levelModules.length} missão(ões) encontrada(s)</p></div>
        <div className="missions-filter-bar">
          <div>{statusFilters.map((filter) => <AppButton key={filter.key} onClick={() => setFilterStatus(filter.key)} variant={filterStatus === filter.key ? 'secondary' : 'ghost'} size="sm">{filter.label}</AppButton>)}</div>
        </div>
        {levelModules.length === 0 ? <InfoCard><InfoCard.Section className="missions-empty-state"><ProgressiveImage src={assets[level.artKey]} alt="" /><h3>Nenhuma missão por aqui ainda</h3><p>Novas aventuras podem chegar a este nível em breve.</p></InfoCard.Section></InfoCard> : (
          <div className="missions-carousel">
            <div className="missions-module-grid">
              {levelModules.length > 3 && <button type="button" className="missions-carousel-arrow is-prev" disabled={carouselStart === 0} onClick={() => { setCarouselDirection('prev'); setCarouselStart((current) => Math.max(0, current - 1)); }} aria-label="Ver missão anterior"><ChevronLeft size={24} /></button>}
              <AnimatePresence initial={false} custom={carouselDirection} mode="popLayout">
                {visibleModules.map((modulo, index) => (
                  <motion.div
                    key={modulo.id}
                    className="missions-module-card-motion"
                    layout="position"
                    custom={carouselDirection}
                    variants={moduleCardVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: prefersReducedMotion ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <ModuloCard modulo={modulo} assets={assets} index={carouselStart + index} onClick={() => onSelectModulo(modulo.id)} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {levelModules.length > 3 && <button type="button" className="missions-carousel-arrow is-next" disabled={carouselStart >= carouselMax} onClick={() => { setCarouselDirection('next'); setCarouselStart((current) => Math.min(carouselMax, current + 1)); }} aria-label="Ver próxima missão"><ChevronRight size={24} /></button>}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
