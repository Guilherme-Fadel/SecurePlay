import { lazy, Suspense, useState, useMemo } from 'react';
import { ArrowLeft, Coins, Gamepad2, RefreshCcw, Sparkles, Trophy, } from 'lucide-react';
import '@/styles/challenges-ui.css';
import { type GameCardData } from './games';
import { GameCarousel } from './GameCarousel';
import { TermoTech } from './games/TermoTech';
import { QuizBlitz } from './games/QuizBlitz';
import { PhishingHunt } from './games/PhishingHunt';
import { DataClassify } from './games/DataClassify';
import { TokenBar } from './TokenBar';
import { useArcadeGames, useTokens } from '@/hooks/useArcade';
import { AppSectionHeader } from '@/components/ui/visuals/AppSectionHeader';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));
export function Challenges() {
    const [active, setActive] = useState<string | null>(null);
    const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
    const { games: apiGames, loading: gamesLoading, error: gamesError, refetch } = useArcadeGames();
    const { tokens, secondsLeft, reload, setFromServer } = useTokens();
    const carouselGames = useMemo<GameCardData[]>(() => {
        return apiGames.map((g) => ({
            id: g.slug,
            title: g.title,
            description: g.description,
            image: getChallengeArtwork(g.image, g.slug),
            xp: g.xp,
            status: g.status,
            tag: g.tag,
            color: g.color,
            colorDark: g.colorDark,
            gameType: g.gameType,
        }));
    }, [apiGames]);
    const handlePlay = (game: GameCardData) => setActive(game.id);
    const exit = () => setActive(null);
    const availableGames = carouselGames.filter((game) => game.status === 'AVAILABLE');
    const maxXp = availableGames.reduce((highest, game) => Math.max(highest, game.xp), 0);
    const categories = new Set(carouselGames.map((game) => game.tag)).size;
    const focusedGame = carouselGames.find((game) => game.id === focusedSlug) ?? carouselGames[0];
    if (active === 'worldmap') {
        return (<div>
        <BackBar onBack={exit}/>
        <div className="relative w-full h-[calc(100vh-190px)] min-h-[420px] rounded-xl overflow-hidden border-2 border-[#2a2f45]">
          <Suspense fallback={<div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                Carregando mapa...
              </div>}>
            <WorldMapPage embedded/>
          </Suspense>
        </div>
      </div>);
    }
    if (active === 'termotech') {
        return <TermoTech onExit={exit}/>;
    }
    if (active === 'quiz-relampago') {
        return (<QuizBlitz onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (active === 'caca-phishing') {
        return (<PhishingHunt onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (active === 'classificacao-dados') {
        return (<DataClassify onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    return (<div className="app-page challenges-page">
      <div className="challenges-heading-row">
        <AppSectionHeader title="Jogos" subtitle="Pratique habilidades de segurança em experiências rápidas e interativas." className="app-page-heading"/>
        <TokenBar tokens={tokens} secondsLeft={secondsLeft}/>
      </div>

      <div className="challenges-overview-grid">
        <InfoCard raised className="challenge-overview-card">
          <InfoCard.Section>
            <InfoCard.Stat label="Jogos disponíveis" value={`${availableGames.length}/${carouselGames.length}`} subtitle="Prontos para jogar" icon={Gamepad2} variant="primary"/>
          </InfoCard.Section>
        </InfoCard>
        <InfoCard raised className="challenge-overview-card">
          <InfoCard.Section>
            <InfoCard.Stat label="Maior recompensa" value={`${maxXp} XP`} subtitle="Por rodada concluída" icon={Trophy} variant="accent"/>
          </InfoCard.Section>
        </InfoCard>
        <InfoCard raised className="challenge-overview-card">
          <InfoCard.Section>
            <InfoCard.Stat label="Tipos de treinamento" value={categories} subtitle="Habilidades diferentes" icon={Sparkles} variant="secondary"/>
          </InfoCard.Section>
        </InfoCard>
      </div>

      <section className="challenge-arena-section">
        <div className="challenge-arena-heading">
          <div>
            <span>Arcade de segurança</span>
            <h3>{focusedGame?.title ?? 'Escolha seu treinamento'}</h3>
            <p>
              {focusedGame
            ? `${focusedGame.tag} · ${focusedGame.xp} XP por conclusão`
            : 'Explore as missões disponíveis para começar.'}
            </p>
          </div>
          <div className="challenge-navigation-hint">
            <ArrowLeft size={13}/>
            <span>Use as setas ou arraste</span>
            <ArrowLeft size={13} className="rotate-180"/>
          </div>
        </div>

        <div className="challenge-arena-body">
          {gamesLoading && carouselGames.length === 0 ? (<div className="challenge-carousel-loading" aria-label="Carregando jogos">
              <div /><div /><div />
            </div>) : gamesError && carouselGames.length === 0 ? (<div className="challenge-catalog-state">
              <Gamepad2 size={28}/>
              <strong>Não foi possível carregar os jogos</strong>
              <p>Confira sua conexão e tente novamente.</p>
              <AppButton variant="soft" size="sm" icon={<RefreshCcw size={14}/>} onClick={refetch}>
                Tentar novamente
              </AppButton>
            </div>) : carouselGames.length === 0 ? (<div className="challenge-catalog-state">
              <Gamepad2 size={28}/>
              <strong>Nenhum jogo disponível</strong>
              <p>Novas atividades aparecerão aqui assim que forem publicadas.</p>
            </div>) : (<GameCarousel games={carouselGames} onPlay={handlePlay} initialSlug={focusedSlug} onFocusChange={setFocusedSlug}/>)}
        </div>
      </section>

      <InfoCard className="challenge-guide-card">
        <InfoCard.Section className="challenge-guide-content">
          <div className="challenge-guide-title">
            <Coins size={18}/>
            <div><strong>Como funciona</strong><span>A ficha é consumida somente ao finalizar um jogo.</span></div>
          </div>
          <div className="challenge-guide-steps">
            <div><i>1</i><span>Escolha uma missão</span></div>
            <div><i>2</i><span>Complete o treinamento</span></div>
            <div><i>3</i><span>Receba sua recompensa</span></div>
          </div>
        </InfoCard.Section>
      </InfoCard>
    </div>);
}
function BackBar({ onBack }: {
    onBack: () => void;
}) {
    return (<AppButton onClick={onBack} variant="ghost" size="sm" icon={<ArrowLeft size={16}/>} className="mb-4">
      Voltar aos jogos
    </AppButton>);
}
