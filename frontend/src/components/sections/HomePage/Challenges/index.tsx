import { lazy, Suspense, useState, useMemo } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GAMES, type GameCardData } from './games';
import { GameCarousel } from './GameCarousel';
import { TermoTech } from './games/TermoTech';
import { QuizBlitz } from './games/QuizBlitz';
import { PhishingHunt } from './games/PhishingHunt';
import { DataClassify } from './games/DataClassify';
import { TokenBar } from './TokenBar';
import { useArcadeGames, useTokens } from '@/hooks/useArcade';

const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));

// Jogos locais (prototipo/estatico) que nao vem da API do arcade.
// worldmap: prototipo isolado. termotech: jogo client-side sem economia de token.
const LOCAL_GAMES: GameCardData[] = GAMES;

// Secao Desafios: arcade de jogos (cartuchos) para ganhar XP extra.
export function Challenges() {
  const [active, setActive] = useState<string | null>(null);
  // slug do jogo em foco no carrossel; preservado ao entrar e sair de um jogo.
  const [focusedSlug, setFocusedSlug] = useState<string | null>(null);
  const { games: apiGames } = useArcadeGames();
  const { tokens, secondsLeft, reload, setFromServer } = useTokens();

  // Mescla catalogo da API (jogos com economia de token) com os jogos locais.
  const carouselGames = useMemo<GameCardData[]>(() => {
    const fromApi: GameCardData[] = apiGames.map((g) => ({
      id: g.slug,
      title: g.title,
      description: g.description,
      image: g.image ?? '',
      xp: g.xp,
      status: g.status,
      tag: g.tag,
      color: g.color,
      colorDark: g.colorDark,
    }));
    // API primeiro (jogos "oficiais"), depois os locais.
    return [...fromApi, ...LOCAL_GAMES];
  }, [apiGames]);

  const handlePlay = (game: GameCardData) => setActive(game.id);
  const exit = () => setActive(null);

  if (active === 'worldmap') {
    return (
      <div>
        <BackBar onBack={exit} />
        <div className="relative w-full h-[calc(100vh-190px)] min-h-[420px] rounded-xl overflow-hidden border-2 border-[#2a2f45]">
          <Suspense
            fallback={
              <div className="flex items-center justify-center h-full text-[var(--text-secondary)]">
                Carregando mapa...
              </div>
            }
          >
            <WorldMapPage embedded />
          </Suspense>
        </div>
      </div>
    );
  }

  if (active === 'termotech') {
    return <TermoTech onExit={exit} />;
  }

  if (active === 'quiz-relampago') {
    return (
      <QuizBlitz
        onExit={() => {
          reload(); // atualiza saldo de tokens ao voltar
          exit();
        }}
        onFinished={(t) => {
          if (t) setFromServer(t);
        }}
      />
    );
  }

  if (active === 'caca-phishing') {
    return (
      <PhishingHunt
        onExit={() => {
          reload();
          exit();
        }}
        onFinished={(t) => {
          if (t) setFromServer(t);
        }}
      />
    );
  }

  if (active === 'classificacao-dados') {
    return (
      <DataClassify
        onExit={() => {
          reload();
          exit();
        }}
        onFinished={(t) => {
          if (t) setFromServer(t);
        }}
      />
    );
  }

  return (
    <div className="flex flex-col items-center min-h-[calc(100vh-190px)] justify-center">
      <div className="mb-6 text-center">
        <h3 className="text-[var(--text-primary)] font-[var(--font-family-base)] leading-tight">
          Desafios
        </h3>
        <p className="text-[var(--text-secondary)] text-sm font-[var(--font-family-inter)] mt-1">
          Deslize e escolha um jogo para ganhar XP extra.
        </p>
      </div>

      {/* saldo de tentativas (tokens) */}
      <div className="mb-6">
        <TokenBar tokens={tokens} secondsLeft={secondsLeft} />
      </div>

      <GameCarousel
        games={carouselGames}
        onPlay={handlePlay}
        initialSlug={focusedSlug}
        onFocusChange={setFocusedSlug}
      />
    </div>
  );
}

function BackBar({ onBack }: { onBack: () => void }) {
  return (
    <button
      onClick={onBack}
      className="flex items-center gap-1.5 mb-4 px-3 py-1.5 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface)] rounded-lg transition-colors cursor-pointer font-[var(--font-family-inter)]"
    >
      <ArrowLeft size={16} />
      <span>Voltar aos desafios</span>
    </button>
  );
}
