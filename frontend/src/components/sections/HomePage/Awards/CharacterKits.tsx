import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import type { AchievementTrail, CosmeticKit } from '@/services/achievements';
import { CharacterRequirements } from './CharacterRequirements';
import { CharacterThumb } from './CharacterThumb';
import { festiveLabel, kitState, type KitState } from './characterModel';
import { keysLabel, missingLabel, rarityLabel, typeLabel } from './collectiblesModel';

export const characterKitId = (id: number) => `chr-kit-${id}`;

interface KitsProps {
  kits: readonly CosmeticKit[];
  balance: number;
  trail: Pick<AchievementTrail, 'nodes'> | null;
  changingKit: number | null;
  /** Qualquer troca em andamento desabilita a compra, para não somar pedidos. */
  locked: boolean;
  onBuy: (kit: CosmeticKit) => void;
  onShowEarn: () => void;
}

/** Kits à venda: cada cartão vende todas as peças de uma vez, sem provar o conjunto. */
export function CharacterKits({ kits, balance, trail, changingKit, locked, onBuy, onShowEarn }: KitsProps) {
  if (kits.length === 0) return null;
  return (
    <section className="chr-kits" aria-labelledby="chr-kits-title">
      <header className="chr-kits-head">
        <h2 id="chr-kits-title" className="cole-display">Kits</h2>
        <small>Cada kit traz as peças juntas; depois da compra você equipa uma a uma.</small>
      </header>
      <ul className="chr-kit-list">
        {kits.map((kit) => (
          <li key={kit.id}>
            <KitCard kit={kit} balance={balance} trail={trail} busy={changingKit === kit.id} locked={locked || changingKit !== null} onBuy={onBuy} onShowEarn={onShowEarn} />
          </li>
        ))}
      </ul>
    </section>
  );
}

function KitCard({ kit, balance, trail, busy, locked, onBuy, onShowEarn }: { kit: CosmeticKit; balance: number; trail: KitsProps['trail']; busy: boolean; locked: boolean; onBuy: (kit: CosmeticKit) => void; onShowEarn: () => void }) {
  const state = kitState(kit);
  const festive = festiveLabel(kit);
  return (
    <article id={characterKitId(kit.id)} tabIndex={-1} className="chr-kit" aria-labelledby={`chr-kit-name-${kit.id}`} aria-busy={busy || undefined}>
      <div className="chr-kit-top">
        <div>
          <h3 id={`chr-kit-name-${kit.id}`} className="chr-kit-name">{kit.name}</h3>
          <span className="cole-row-tags">
            <span className={`cole-rarity cole-rarity--${kit.rarity}`}>{rarityLabel[kit.rarity]}</span>
            {festive && <small>{festive}</small>}
          </span>
        </div>
        <span className="cole-price"><DigitalKeyIcon size={20} /><span className="sr-only">Preço: </span>{kit.price}</span>
      </div>
      {kit.description && <p className="chr-kit-desc">{kit.description}</p>}
      <KitPieces kit={kit} locked={state === 'lock'} />
      {state !== 'own' && <CharacterRequirements unlock={kit.unlock} trail={trail} id={`chr-kit-req-${kit.id}`} />}
      <KitFooter kit={kit} state={state} balance={balance} busy={busy} locked={locked} onBuy={onBuy} onShowEarn={onShowEarn} />
    </article>
  );
}

interface KitFooterProps {
  kit: CosmeticKit;
  state: KitState;
  balance: number;
  busy: boolean;
  locked: boolean;
  onBuy: (kit: CosmeticKit) => void;
  onShowEarn: () => void;
}

/** O único botão do cartão (Comprar kit) com o motivo ao lado quando não dá para comprar; comprado mostra "No seu acervo". */
function KitFooter({ kit, state, balance, busy, locked, onBuy, onShowEarn }: KitFooterProps) {
  if (state === 'own') return <div className="chr-kit-foot"><span className="cole-pill cole-pill--own">No seu acervo</span></div>;
  const hintId = `chr-kit-hint-${kit.id}`;
  return (
    <div className="chr-kit-foot">
      <AppButton
        variant="chunky"
        tone="yellow"
        disabled={state !== 'buy' || locked}
        aria-describedby={state === 'buy' ? undefined : hintId}
        icon={busy ? <Loader2 className="animate-spin" size={18} aria-hidden="true" /> : undefined}
        onClick={() => onBuy(kit)}
      >
        {busy ? 'Comprando…' : 'Comprar kit'}
      </AppButton>
      {state !== 'buy' && (
        <small id={hintId} className="chr-kit-hint">
          {state === 'save' ? `${missingLabel(kit.price, balance)} · custa ${keysLabel(kit.price)}` : 'Cumpra as exigências para comprar'}
        </small>
      )}
      {state === 'save' && <button type="button" className="cole-link" onClick={onShowEarn}>Como ganhar chaves</button>}
    </div>
  );
}

function KitPieces({ kit, locked }: { kit: CosmeticKit; locked: boolean }) {
  if (kit.pieces.length === 0) return null;
  return (
    <ul className="chr-kit-pieces" aria-label={`Peças de ${kit.name}`}>
      {kit.pieces.map((piece) => (
        <li key={piece.id} className="chr-kit-piece">
          <span className={cn('cole-tile', locked && 'is-locked')}><CharacterThumb source={piece} size={48} /></span>
          <span className="chr-kit-piece-text"><b>{piece.name}</b><small>{typeLabel[piece.type]}</small></span>
        </li>
      ))}
    </ul>
  );
}
