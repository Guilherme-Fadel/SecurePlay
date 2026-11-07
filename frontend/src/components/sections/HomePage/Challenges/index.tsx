import { useState, useMemo, useEffect, useCallback } from 'react';
import '@/styles/challenge-games-ui.css';
import '@/styles/game-deck.css';
import { CHILD_GAME_COPY, type GameCardData } from './games';
import { GameDeck } from './GameDeck';
import { GameDeckMessage, GameDeckSkeleton } from './GameDeckStates';
import { TokenCoins } from './TokenCoins';
import { TermoTech } from './games/TermoTech';
import { QuizBlitz } from './games/QuizBlitz';
import { PhishingHunt } from './games/PhishingHunt';
import { DataClassify } from './games/DataClassify';
import { useArcadeGames, useTokens } from '@/hooks/useArcade';
import { getChallengeArtwork } from '@/lib/challengeArtwork';
import { useCompanyFeatures } from '@/hooks/useCompanyFeatures';
import { useCurrentUserContext } from '@/contexts/CurrentUserContext';

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
            gameType: g.gameType,
          }));
    }, [apiGames, features.games]);
    // Estável: o GameDeck é memo e não re-renderiza a cada segundo do relógio de fichas.
    const handlePlay = useCallback((game: GameCardData) => {
        setFocusedSlug(game.id);
        setActive(game.id);
    }, []);
    const [returning, setReturning] = useState(false);
    const exit = () => {
        setReturning(true);
        setActive(null);
    };
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
    return (<div className="deck-v">
      <header className="dk-head">
        <div>
          <h1 className="dk-display">Jogos</h1>
          <p className="dk-lead">Entre no castelo, descubra pistas e proteja seus amigos brincando.</p>
        </div>
        <TokenCoins tokens={tokens} secondsLeft={secondsLeft}/>
      </header>

      {gamesLoading && catalogGames.length === 0 ? (<GameDeckSkeleton />)
        : gamesError && catalogGames.length === 0 ? (<GameDeckMessage kind="error" onRetry={refetch}/>)
        : catalogGames.length === 0 ? (<GameDeckMessage kind="empty"/>)
        : (<GameDeck games={catalogGames} tokens={tokens} onPlay={handlePlay} initialSlug={focusedSlug} onFocusChange={setFocusedSlug} focusOnMount={returning}/>)}
    </div>);
}

function TermoTechSession({ onExit }: { onExit: () => void }) {
    const { user } = useCurrentUserContext();
    const userId = user?.userId ?? null;
    return <TermoTech key={userId ?? 'anonymous'} userId={userId} onExit={onExit}/>;
}
