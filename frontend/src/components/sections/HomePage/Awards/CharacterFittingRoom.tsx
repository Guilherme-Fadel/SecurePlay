import { useState, type Ref } from 'react';
import { DEFAULT_CHARACTER_COLOR, characterColorLabel, type CharacterColor } from '@/components/shared/Character/characterColor';
import type { useAchievementShop } from '@/hooks/useAchievements';
import type { AchievementShop, AchievementTrail, CosmeticItem, CosmeticKit } from '@/services/achievements';
import type { CurrentUser } from '@/services/me';
import { characterColorId, CharacterColors } from './CharacterColors';
import { CharacterItemPanel, characterSwatchId } from './CharacterItemPanel';
import { CharacterItems, characterItemId } from './CharacterItems';
import { CharacterKits, characterKitId } from './CharacterKits';
import { CharacterPreview } from './CharacterPreview';
import { buildCharacterLook, CHARACTER_SLOTS, isCharacterSlot, type CharacterSlot } from './characterModel';
import { CollectiblesEarn } from './CollectiblesEarn';
import { FeedbackRegions, type Feedback } from './CollectiblesFeedback';
import { extractErrorMessage } from './collectiblesModel';
import '@/styles/character-fitting.css';

type ShopState = ReturnType<typeof useAchievementShop>;

interface FittingRoomProps {
  shop: AchievementShop;
  shopState: ShopState;
  trail: AchievementTrail | null;
  user: CurrentUser | null;
  level: number | null;
  /** "Como ganhar mais chaves": o mesmo bloco e atalho da prateleira, para o aluno sem saldo. */
  earnRef: Ref<HTMLHeadingElement>;
  onShowEarn: () => void;
}

/** Executa a ação do backend e mostra o resultado na região de feedback; a recusa pode vir de estado antigo, então recarrega. */
function useShopAction(refetch: ShopState['refetch']) {
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const run = async (action: () => Promise<unknown>, success: string, fallback: string, afterFocusId?: string): Promise<boolean> => {
    setFeedback(null);
    try {
      await action();
      setFeedback({ kind: 'success', text: success });
      if (afterFocusId) document.getElementById(afterFocusId)?.focus();
      return true;
    } catch (requestError: unknown) {
      setFeedback({ kind: 'error', text: extractErrorMessage(requestError) ?? fallback });
      void refetch();
      return false;
    }
  };
  return { feedback, clearFeedback: () => setFeedback(null), run };
}

/**
 * Colecionáveis › Personagem: o personagem no palco e no placar, as abas por
 * encaixe, o painel do item em prova e os kits. Posse, saldo e exigências vêm
 * do backend; a prévia nunca grava nada.
 */
export function CharacterFittingRoom({ shop, shopState, trail, user, level, earnRef, onShowEarn }: FittingRoomProps) {
  const { changingItem, changingKit, changingColor, chooseColor, purchase, purchaseKit, equip, unequip, refetch } = shopState;
  const [slot, setSlot] = useState<CharacterSlot>(CHARACTER_SLOTS[0].slot);
  // Um item em prova por encaixe: trocar de aba não desfaz a prova das outras (o aluno vê o conjunto).
  const [trials, setTrials] = useState<Partial<Record<CharacterSlot, number>>>({});
  const [activeId, setActiveId] = useState<number | null>(null);
  const { feedback, clearFeedback, run } = useShopAction(refetch);

  const trialItems = shop.items.filter((item) => Object.values(trials).includes(item.id));
  const trying = shop.items.find((item) => item.id === activeId) ?? null;
  const look = buildCharacterLook(shop, trialItems);
  const bodyColor = shop.character?.color ?? DEFAULT_CHARACTER_COLOR;
  const locked = changingItem !== null || changingKit !== null || changingColor !== null;

  /** Tira da prova o item do encaixe dele (depois de comprar, equipar, tirar ou limpar). */
  const endTrial = (item: CosmeticItem) => {
    setTrials((current) => Object.fromEntries(Object.entries(current).filter(([, id]) => id !== item.id)));
    setActiveId((current) => (current === item.id ? null : current));
  };

  const tryItem = (item: CosmeticItem) => {
    clearFeedback();
    if (!isCharacterSlot(item.type)) return;
    if (trials[item.type] === item.id) {
      endTrial(item);
      return;
    }
    const type = item.type;
    setTrials((current) => ({ ...current, [type]: item.id }));
    setActiveId(item.id);
  };

  const changeSlot = (next: CharacterSlot) => {
    setSlot(next);
    setActiveId(trials[next] ?? null);
  };

  const onBuy = async (item: CosmeticItem) => {
    const done = await run(() => purchase(item.id), `${item.name} agora é seu e já está no seu personagem.`, 'Não foi possível adquirir o item.', characterItemId(item.id));
    if (done) endTrial(item);
  };

  const onEquip = async (item: CosmeticItem, color?: string) => {
    const done = await run(() => equip(item.id, color), color ? `Cor de ${item.name} atualizada.` : `${item.name} equipado.`, 'Não foi possível equipar o item.', color ? characterSwatchId(item.id, color) : characterItemId(item.id));
    if (done && !color) endTrial(item);
  };

  const onUnequip = async (item: CosmeticItem) => {
    const done = await run(() => unequip(item.type, item.id), `${item.name} saiu do seu personagem.`, 'Não foi possível remover o item.', characterItemId(item.id));
    if (done) endTrial(item);
  };

  const onChooseColor = (color: CharacterColor) => {
    void run(() => chooseColor(color), `Cor ${characterColorLabel(color).toLowerCase()} escolhida.`, 'Não foi possível trocar a cor do personagem.', characterColorId(color));
  };

  const onBuyKit = (kit: CosmeticKit) => {
    void run(() => purchaseKit(kit.id), `${kit.name} agora está no seu acervo. Equipe as peças pela coleção.`, 'Não foi possível comprar o kit.', characterKitId(kit.id));
  };

  return (
    <section className="chr" aria-labelledby="chr-title">
      <header className="chr-head">
        <span className="cole-eyebrow">Personagem</span>
        <h2 id="chr-title" className="cole-display chr-title">Monte seu personagem</h2>
      </header>
      <p className="sr-only" aria-live="polite">{trying ? `Prévia no personagem: ${trying.name}.` : ''}</p>
      <div className="chr-grid">
        <div className="chr-work">
          <CharacterPreview
            look={look}
            user={user}
            level={level}
            color={bodyColor}
            colors={<CharacterColors color={bodyColor} changing={changingColor} locked={locked} onChoose={onChooseColor} />}
          />
          <div className="cole-act">
            <FeedbackRegions feedback={feedback} />
            <CharacterItemPanel
              item={trying}
              balance={shop.prestigeBalance}
              trail={trail}
              locked={locked}
              busy={trying !== null && changingItem === trying.id}
              onBuy={onBuy}
              onEquip={onEquip}
              onUnequip={onUnequip}
              onClear={() => { if (trying) endTrial(trying); }}
              onShowEarn={onShowEarn}
            />
          </div>
        </div>
        <div className="chr-side">
          <CharacterItems shop={shop} slot={slot} onSlotChange={changeSlot} tryingId={trials[slot] ?? null} onTry={tryItem} balance={shop.prestigeBalance} />
          <CharacterKits kits={shop.kits} balance={shop.prestigeBalance} trail={trail} changingKit={changingKit} locked={locked} onBuy={onBuyKit} onShowEarn={onShowEarn} />
          <CollectiblesEarn ref={earnRef} trail={trail} balance={shop.prestigeBalance} />
        </div>
      </div>
    </section>
  );
}
