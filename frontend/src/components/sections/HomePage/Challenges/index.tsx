import { lazy, Suspense, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GAMES, type GameCardData } from './games';
import { GameCard } from './GameCard';
import { TermoTech } from './games/TermoTech';

const WorldMapPage = lazy(() => import('@/prototypes/worldmap/WorldMapPage'));

type ActiveGame = 'worldmap' | 'termotech' | null;

// Secao Desafios: "arcade" de jogos (cartuchos) para ganhar XP extra.
export function Challenges() {
  const [active, setActive] = useState<ActiveGame>(null);

  const handlePlay = (game: GameCardData) => setActive(game.id as ActiveGame);

  // Mapa embutido dentro da area de conteudo (respeita sidebar/header).
  if (active === 'worldmap') {
    return (
      <div>
        <BackBar onBack={() => setActive(null)} />
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
    return <TermoTech onExit={() => setActive(null)} />;
  }

  return (
    <div>
      <div className="mb-6">
        <h3 className="text-[var(--text-primary)] font-[var(--font-family-base)] leading-tight">
          Desafios
        </h3>
        <p className="text-[var(--text-secondary)] text-sm font-[var(--font-family-inter)] mt-1">
          Escolha um cartucho e complete minigames para ganhar XP extra.
        </p>
      </div>

      {/* cards grandes em destaque */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 max-w-5xl">
        {GAMES.map((game) => (
          <GameCard key={game.id} game={game} onPlay={handlePlay} />
        ))}
      </div>
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
