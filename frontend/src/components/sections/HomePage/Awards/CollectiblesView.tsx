import { useRef } from 'react';
import { useReducedMotion } from 'motion/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { useAchievementShop } from '@/hooks/useAchievements';
import type { getAchievementTrail } from '@/services/achievements';
import { CharacterFittingRoom } from './CharacterFittingRoom';
import { CollectiblesEmpty, CollectiblesError, CollectiblesLoading } from './CollectiblesStates';
import { profileLevel } from './collectiblesModel';
import '@/styles/collectibles.css';

type Trail = Awaited<ReturnType<typeof getAchievementTrail>>;

/**
 * Conquistas › Colecionáveis: o Personagem (palco, placar, encaixes e kits) com
 * "Como ganhar mais chaves". Saldo, posse, exigência e compra vêm do backend via `useAchievementShop`.
 */
export function CollectiblesView({ shopState, trail }: { shopState: ReturnType<typeof useAchievementShop>; trail: Trail | null }) {
  const { data: shop, error, refetch } = shopState;
  const { user } = useCurrentUser();
  const reduceMotion = useReducedMotion() === true;
  const earnHeadingRef = useRef<HTMLHeadingElement>(null);

  if (!shop) return error ? <CollectiblesError onRetry={refetch} /> : <CollectiblesLoading />;
  if (shop.items.length === 0 && shop.kits.length === 0) return <CollectiblesEmpty />;

  const showEarn = () => {
    const heading = earnHeadingRef.current;
    if (!heading) return;
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  return (
    <div className="cole-v">
      <CharacterFittingRoom shop={shop} shopState={shopState} trail={trail} user={user} level={profileLevel(trail, user)} earnRef={earnHeadingRef} onShowEarn={showEarn} />
    </div>
  );
}
