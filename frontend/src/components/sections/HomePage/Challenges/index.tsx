import { useState, useMemo, useEffect } from 'react';
import { Gamepad2, RefreshCcw } from 'lucide-react';
import '@/styles/challenges-ui.css';
import '@/styles/challenge-games-ui.css';
import { type GameCardData } from './games';
import { GameCarousel } from './GameCarousel';
import { TermoTech } from './games/TermoTech';
import { QuizBlitz } from './games/QuizBlitz';
import { PhishingHunt } from './games/PhishingHunt';
import { DataClassify } from './games/DataClassify';
import { TokenBar } from './TokenBar';
import { useArcadeGames, useTokens } from '@/hooks/useArcade';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCurrentUserContext } from '@/contexts/CurrentUserContext';

const CHILD_GAME_COPY: Record<string, { title: string; description: string; tag: string }> = {
  'quiz-relampago': {
    title: 'Quiz Relâmpago',
    description: 'Responda perguntas rápidas antes que o tempo acabe.',
    tag: 'Desafio',
  },
  'caca-phishing': {
    title: 'Detetives de Mensagens',
    description: 'Encontre pistas e descubra se um recado é confiável.',
    tag: 'Investigação',
  },
  'classificacao-dados': {
    title: 'Escudos dos Segredos',
    description: 'Escolha o escudo certo para proteger cada informação.',
    tag: 'Proteção',
  },
  termotech: {
    title: 'Palavra Secreta',
    description: 'Use as pistas para descobrir a palavra de cinco letras.',
    tag: 'Palavras',
  },
};

export function Challenges() {
    const features = useCompanyFeatures();
    const [active, setActive] = useState<string | null>(null);
    useEffect(() => {
      if (active && !features.games.some((slug) => slug === active)) setActive(null);
    }, [active, features.games]);
    const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
    const { games: apiGames, loading: gamesLoading, error: gamesError, refetch } = useArcadeGames();
    const { tokens, secondsLeft, reload, setFromServer } = useTokens();
    const catalogGames = useMemo<GameCardData[]>(() => {
        return apiGames
          .filter((game) => features.games.some((slug) => slug === game.slug))
          .map((g) => ({
            id: g.slug,
            title: CHILD_GAME_COPY[g.slug]?.title ?? g.title,
            description: CHILD_GAME_COPY[g.slug]?.description ?? g.description,
            image: getChallengeArtwork(g.image, g.slug),
            xp: g.xp,
            status: g.status,
            tag: CHILD_GAME_COPY[g.slug]?.tag ?? g.tag,
            color: g.color,
            colorDark: g.colorDark,
            gameType: g.gameType,
          }));
    }, [apiGames, features.games]);
    const handlePlay = (game: GameCardData) => setActive(game.id);
    const exit = () => setActive(null);
    const activeGame = features.games.some((slug) => slug === active) ? active : null;
    if (activeGame === 'termotech') {
        return <TermoTechSession onExit={exit}/>;
    }
    if (activeGame === 'quiz-relampago') {
        return (<QuizBlitz onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (activeGame === 'caca-phishing') {
        return (<PhishingHunt onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (activeGame === 'classificacao-dados') {
        return (<DataClassify onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    return (<div className="app-page home-section challenges-page">
      <h1 className="sr-only">Jogos</h1>
      <header className="home-section-toolbar">
        <span className="home-section-summary">{catalogGames.length} jogos para explorar</span>
        <TokenBar tokens={tokens} secondsLeft={secondsLeft}/>
      </header>

      <section className="challenge-arena-section" aria-label="Catálogo de jogos">
        <div className="challenge-arena-body">
          {gamesLoading && catalogGames.length === 0 ? (<div className="challenge-carousel-loading" role="status" aria-label="Carregando jogos">
              <div /><div /><div />
            </div>) : gamesError && catalogGames.length === 0 ? (<div className="challenge-catalog-state" role="alert">
              <Gamepad2 size={28}/>
              <strong>Não foi possível carregar os jogos</strong>
              <p>Confira sua conexão e tente novamente.</p>
              <AppButton variant="soft" size="sm" icon={<RefreshCcw size={14}/>} onClick={refetch}>
                Tentar novamente
              </AppButton>
            </div>) : catalogGames.length === 0 ? (<div className="challenge-catalog-state" role="status">
              <Gamepad2 size={28}/>
              <strong>Nenhum jogo disponível</strong>
              <p>Novas atividades aparecerão aqui assim que forem publicadas.</p>
            </div>) : (<GameCarousel games={catalogGames} onPlay={handlePlay} initialSlug={focusedSlug} onFocusChange={setFocusedSlug}/>)}
        </div>
      </section>

    </div>);
}

function TermoTechSession({ onExit }: { onExit: () => void }) {
    const { user } = useCurrentUserContext();
    const userId = user?.userId ?? null;
    return <TermoTech key={userId ?? 'anonymous'} userId={userId} onExit={onExit}/>;
}
