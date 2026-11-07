import { useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import type { useAchievementShop } from '@/hooks/useAchievements';
import type { getAchievementTrail, CosmeticItem, CosmeticType } from '@/services/achievements';
import { CollectiblesFittingRoom, type Feedback } from './CollectiblesFittingRoom';
import { CollectiblesShop, collectibleItemId } from './CollectiblesShop';
import { CollectiblesEarn } from './CollectiblesEarn';
import { CollectiblesEmpty, CollectiblesError, CollectiblesLoading } from './CollectiblesStates';
import { buildLook, extractErrorMessage, initialTab, requirementInfo } from './collectiblesModel';
import '@/styles/collectibles.css';

type Trail = Awaited<ReturnType<typeof getAchievementTrail>>;

/**
 * Conquistas › Colecionáveis: provador fixo, abas por tipo e "Como ganhar mais
 * chaves". Saldo, posse, requisito e compra vêm do backend via `useAchievementShop`.
 */
export function CollectiblesView({ shopState, trail }: { shopState: ReturnType<typeof useAchievementShop>; trail: Trail | null }) {
  const { data: shop, error, refetch, changingItem, purchase, equip, unequip } = shopState;
  const { user } = useCurrentUser();
  const reduceMotion = useReducedMotion() === true;
  const [tabChoice, setTabChoice] = useState<CosmeticType | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const earnHeadingRef = useRef<HTMLHeadingElement>(null);

  if (!shop) return error ? <CollectiblesError onRetry={refetch} /> : <CollectiblesLoading />;
  if (shop.items.length === 0) return <CollectiblesEmpty />;

  const tab = tabChoice ?? initialTab(shop.items);
  const selected = shop.items.find((item) => item.id === selectedId) ?? null;
  const look = buildLook(shop, selected);
  const level = trail?.summary.level ?? user?.level ?? null;

  const select = (item: CosmeticItem) => {
    setFeedback(null);
    setSelectedId((current) => (current === item.id ? null : item.id));
  };

  const run = async (item: CosmeticItem, action: () => Promise<unknown>, success: string, fallback: string) => {
    setFeedback(null);
    try {
      await action();
      setSelectedId(null);
      setFeedback({ kind: 'success', text: success });
      document.getElementById(collectibleItemId(item.id))?.focus();
    } catch (requestError: unknown) {
      setFeedback({ kind: 'error', text: extractErrorMessage(requestError) ?? fallback });
      // A recusa pode vir de estado desatualizado (saldo, posse): busca o estado real do backend.
      void refetch();
    }
  };

  const showEarn = () => {
    const heading = earnHeadingRef.current;
    if (!heading) return;
    heading.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
    heading.focus({ preventScroll: true });
  };

  return (
    <div className="cole-v">
      <div className="cole-grid">
        <CollectiblesFittingRoom
          user={user}
          level={level}
          look={look}
          selected={selected}
          requirement={selected ? requirementInfo(selected, trail) : null}
          balance={shop.prestigeBalance}
          changingItem={changingItem}
          feedback={feedback}
          onBuy={(item) => run(item, () => purchase(item.id), `${item.name} agora é seu e já está no seu perfil.`, 'Não foi possível adquirir o item.')}
          onEquip={(item) => run(item, () => equip(item.id), `${item.name} equipado.`, 'Não foi possível equipar o item.')}
          onUnequip={(item) => run(item, () => unequip(item.type, item.id), `${item.name} saiu do seu perfil.`, 'Não foi possível desequipar o item.')}
          onClear={() => setSelectedId(null)}
          onShowEarn={showEarn}
        />
        <div className="cole-side">
          <CollectiblesShop
            items={shop.items}
            tab={tab}
            onTabChange={setTabChoice}
            selectedId={selectedId}
            onSelect={select}
            balance={shop.prestigeBalance}
            trail={trail}
          />
          <CollectiblesEarn ref={earnHeadingRef} trail={trail} balance={shop.prestigeBalance} />
        </div>
      </div>
    </div>
  );
}
