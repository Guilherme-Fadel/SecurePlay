import { useState, useMemo, useEffect, useCallback } from 'react';
import '@/styles/game-deck.css';
import { CHILD_GAME_COPY, type GameCardData } from './games';
import { GameDeck } from './GameDeck';
import { GameDeckMessage, GameDeckSkeleton } from './GameDeckStates';
import { TokenCoins } from './TokenCoins';
import { PalavraSecreta } from './games/PalavraSecreta';
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
            roundSize: g.roundSize,
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
        return <PalavraSecretaSession onExit={exit} xp={xpOf(catalogGames, 'termotech')}/>;
    }
    if (activeGame === 'quiz-relampago') {
        return (<QuizBlitz xp={xpOf(catalogGames, 'quiz-relampago')} roundSize={roundSizeOf(catalogGames, 'quiz-relampago')} onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (activeGame === 'caca-phishing') {
        return (<PhishingHunt xp={xpOf(catalogGames, 'caca-phishing')} roundSize={roundSizeOf(catalogGames, 'caca-phishing')} onExit={() => {
                reload();
                exit();
            }} onFinished={(t) => {
                if (t)
                    setFromServer(t);
            }}/>);
    }
    if (activeGame === 'classificacao-dados') {
        return (<DataClassify xp={xpOf(catalogGames, 'classificacao-dados')} roundSize={roundSizeOf(catalogGames, 'classificacao-dados')} onExit={() => {
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
          <p className="dk-lead">Descubra pistas, proteja seus segredos e ajude seus amigos brincando.</p>
        </div>
        <TokenCoins tokens={tokens} secondsLeft={secondsLeft}/>
      </header>

      {gamesLoading && catalogGames.length === 0 ? (<GameDeckSkeleton />)
        : gamesError && catalogGames.length === 0 ? (<GameDeckMessage kind="error" onRetry={refetch}/>)
        : catalogGames.length === 0 ? (<GameDeckMessage kind="empty"/>)
        : (<GameDeck games={catalogGames} tokens={tokens} onPlay={handlePlay} initialSlug={focusedSlug} onFocusChange={setFocusedSlug} focusOnMount={returning}/>)}
    </div>);
}

function PalavraSecretaSession({ onExit, xp }: { onExit: () => void; xp?: number }) {
    const { user } = useCurrentUserContext();
    const userId = user?.userId ?? null;
    return <PalavraSecreta key={userId ?? 'anonymous'} userId={userId} xp={xp} onExit={onExit}/>;
}

function roundSizeOf(games: GameCardData[], slug: string): number | undefined {
    return games.find((game) => game.id === slug)?.roundSize;
}

function xpOf(games: GameCardData[], slug: string): number | undefined {
    return games.find((game) => game.id === slug)?.xp;
}
