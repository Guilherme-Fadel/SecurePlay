import { Loader2, RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { cn } from '@/lib/utils';
import type { AchievementTrail, CosmeticItem } from '@/services/achievements';
import { CharacterRequirements } from './CharacterRequirements';
import { CharacterThumb } from './CharacterThumb';
import { acceptsColor, COLOR_CHOICES, festiveLabel, sameColor } from './characterModel';
import { itemState, keySegments, keysLabel, missingLabel, rarityLabel, typeLabel } from './collectiblesModel';

export const characterSwatchId = (itemId: number, hex: string) => `chr-swatch-${itemId}-${hex.slice(1)}`;

export interface ItemPanelActions {
  onBuy: (item: CosmeticItem) => void;
  onEquip: (item: CosmeticItem, color?: string) => void;
  onUnequip: (item: CosmeticItem) => void;
  onClear: () => void;
  onShowEarn: () => void;
}

interface ItemPanelProps extends ItemPanelActions {
  item: CosmeticItem | null;
  balance: number;
  trail: Pick<AchievementTrail, 'nodes'> | null;
  /** Há uma troca em andamento (de item ou de kit): os botões ficam desabilitados. */
  locked: boolean;
  busy: boolean;
}

const spinner = <Loader2 className="animate-spin" size={18} aria-hidden="true" />;

/** Painel do item em prova: o que ele é, o que falta e a única ação principal. */
export function CharacterItemPanel(props: ItemPanelProps) {
  const { item } = props;
  if (!item) return <EmptyPanel />;
  const state = itemState(item);
  return (
    <div className="cole-act-item" aria-busy={props.busy || undefined}>
      <ItemHead item={item} equipped={state === 'equipped'} />
      {item.description && <p className="cole-act-desc">{item.description}</p>}
      {!item.owned && <CharacterRequirements unlock={item.unlock} trail={props.trail} id="chr-item-req" />}
      <Actions {...props} item={item} />
    </div>
  );
}

function EmptyPanel() {
  return (
    <div className="cole-act-empty">
      <span className="cole-act-character"><BrandCharacter expression="curious" /></span>
      <p>Toque num item para ver como fica no seu personagem. Experimentar não gasta chaves.</p>
    </div>
  );
}

function ItemHead({ item, equipped }: { item: CosmeticItem; equipped: boolean }) {
  const festive = festiveLabel(item);
  return (
    <div className={cn('cole-act-head', item.type === 'card' && 'cole-act-head--strip')}>
      <span className={cn('cole-tile', item.type === 'card' && 'cole-tile--strip', !item.owned && !item.unlock.met && 'is-locked')}><CharacterThumb source={item} /></span>
      <div>
        <span className="cole-eyebrow">{equipped ? 'No seu personagem' : 'Experimentando'}</span>
        <strong>{item.name}</strong>
        <small>{typeLabel[item.type]} · {rarityLabel[item.rarity]}{festive ? ` · ${festive}` : ''}</small>
      </div>
    </div>
  );
}

function BackButton({ onClear }: { onClear: () => void }) {
  return (
    <AppButton variant="ghost" size="sm" onClick={onClear} icon={<RotateCcw size={16} aria-hidden="true" />}>
      Voltar ao equipado
    </AppButton>
  );
}

type ActionsProps = ItemPanelProps & { item: CosmeticItem };

function Actions(props: ActionsProps) {
  const state = itemState(props.item);
  if (state === 'equipped') return <EquippedActions {...props} />;
  if (state === 'own') return <OwnActions {...props} />;
  if (state === 'lock') return <div className="cole-acts"><BackButton onClear={props.onClear} /></div>;
  return <BuyActions {...props} save={state === 'save'} />;
}

function EquippedActions({ item, locked, busy, onEquip, onUnequip }: ActionsProps) {
  return (
    <>
      {acceptsColor(item) && <ColorChoices item={item} disabled={locked} onPick={(color) => onEquip(item, color)} />}
      <div className="cole-acts">
        <span className="cole-pill cole-pill--equipped">Equipado</span>
        <AppButton variant="soft" size="sm" disabled={locked} icon={busy ? spinner : undefined} onClick={() => onUnequip(item)}>
          {busy ? 'Removendo…' : 'Remover'}
        </AppButton>
      </div>
    </>
  );
}

function OwnActions({ item, locked, busy, onEquip, onClear }: ActionsProps) {
  return (
    <div className="cole-acts">
      <AppButton variant="chunky" tone="blue" disabled={locked} icon={busy ? spinner : undefined} onClick={() => onEquip(item)}>
        {busy ? 'Equipando…' : 'Equipar'}
      </AppButton>
      <BackButton onClear={onClear} />
    </div>
  );
}

/** Comprar (ou, sem saldo, o mesmo botão desabilitado com quanto falta). */
function BuyActions({ item, balance, locked, busy, save, onBuy, onClear, onShowEarn }: ActionsProps & { save: boolean }) {
  const missing = missingLabel(item.price, balance);
  return (
    <>
      {save ? (
        <div className="cole-cost">
          <span id="chr-save-hint">{missing} · custa {keysLabel(item.price)}, você tem {balance}</span>
          <span className="cole-keybar" aria-hidden="true">
            {keySegments(item.price, balance).map((lit, index) => <span key={index} className={lit ? 'is-on' : undefined} />)}
          </span>
        </div>
      ) : (
        <p className="cole-cost">Custa {keysLabel(item.price)} · você tem {balance}</p>
      )}
      <div className="cole-acts">
        <AppButton
          variant="chunky"
          tone="yellow"
          disabled={save || locked}
          aria-describedby={save ? 'chr-save-hint' : undefined}
          icon={busy ? spinner : <DigitalKeyIcon size={22} />}
          onClick={() => onBuy(item)}
        >
          {busy ? 'Adquirindo…' : save ? missing : `Adquirir por ${item.price}`}
        </AppButton>
        <BackButton onClear={onClear} />
      </div>
      {save ? (
        <button type="button" className="cole-link" onClick={onShowEarn}>Como ganhar chaves</button>
      ) : (
        <p className="cole-note">Ao adquirir, o item já fica equipado no seu personagem.</p>
      )}
    </>
  );
}

/** Paleta curta (tokens da marca) para peça recolorível ou fundo "do seu jeito"; sem seletor livre. */
function ColorChoices({ item, disabled, onPick }: { item: CosmeticItem; disabled: boolean; onPick: (color: string) => void }) {
  return (
    <div className="chr-colors" role="group" aria-label={`Cor de ${item.name}`}>
      <span className="chr-colors-label">Cor</span>
      {COLOR_CHOICES.map((choice) => (
        <button
          key={choice.hex}
          id={characterSwatchId(item.id, choice.hex)}
          type="button"
          className="chr-swatch"
          style={{ background: `var(${choice.token})` }}
          aria-label={choice.name}
          aria-pressed={sameColor(item.color, choice.hex)}
          // aria-disabled (e não disabled) para o foco não se perder enquanto a troca acontece.
          aria-disabled={disabled || undefined}
          onClick={() => { if (!disabled) onPick(choice.hex); }}
        />
      ))}
    </div>
  );
}
