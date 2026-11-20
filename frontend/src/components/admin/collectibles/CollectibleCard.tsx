import { Archive, Eye, Plus } from 'lucide-react';
import { BRAND_CHARACTER_BODY } from '@/components/shared/BrandCharacter';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { CharacterThumb } from '@/components/sections/HomePage/Awards/CharacterThumb';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import { cn } from '@/lib/utils';
import '@/styles/character-fitting.css';
import { cardBadges, collectibleStatus, isKit, kitLook, piecesLabel, priceLabel, rarityName, rowActions, slotLabel, statusLabel, type CollectibleRow } from './adminCollectiblesModel';

export interface CollectibleCardProps {
  row: CollectibleRow;
  busy: boolean;
  onEdit: (row: CollectibleRow) => void;
  onToggle: (row: CollectibleRow) => void;
}

/** Arte do cartão: o item com seu ajuste e camada, ou o personagem padrão vestindo as peças do kit. */
function CardArt({ row }: { row: CollectibleRow }) {
  if (!isKit(row)) return <CharacterThumb source={row} size={96} />;
  return <CharacterAvatar look={kitLook(row)} color={BRAND_CHARACTER_BODY} variant="full" />;
}

/** Cartão clicável inteiro (abre a edição); publicar/tirar da loja é um botão só de ícone ao lado, fora do botão principal. */
export function CollectibleCard({ row, busy, onEdit, onToggle }: CollectibleCardProps) {
  const publish = rowActions(row).publish;
  const status = collectibleStatus(row);
  const badges = cardBadges(row);
  const detailId = `collectible-card-${isKit(row) ? 'kit' : 'item'}-${row.id}`;
  const toggleLabel = `${publish ? 'Publicar' : 'Tirar da loja'} ${row.name}`;
  return <li className="collectible-card-cell">
    <button type="button" className={cn('collectible-card', `is-${row.rarity}`, !row.active && 'is-draft')} aria-label={`Editar ${row.name}`} aria-describedby={detailId} onClick={() => onEdit(row)}>
      <span className={cn('collectible-card-art', isKit(row) && 'is-kit')}><CardArt row={row} /></span>
      <strong className="collectible-card-name">{row.name}</strong>
      <span id={detailId} className="collectible-card-info">
        <span className="collectible-card-tags">
          <span className={`collectible-rarity collectible-rarity--${row.rarity}`}>{rarityName(row.rarity)}</span>
          <span className={cn('collectible-state', row.active ? 'is-published' : 'is-draft')}>{statusLabel[status]}</span>
        </span>
        <span className="collectible-card-slot">{isKit(row) ? piecesLabel(row.pieces) : slotLabel(row.type)}</span>
        <span className="collectible-card-price"><DigitalKeyIcon size={18} />{priceLabel(row.price)}</span>
        {badges.length > 0 && <span className="collectible-card-badges">{badges.map((badge) => <span key={badge} className="collectible-badge">{badge}</span>)}</span>}
      </span>
    </button>
    <button type="button" className="collectible-card-toggle" aria-label={toggleLabel} title={publish ? 'Publicar' : 'Tirar da loja'} disabled={busy} onClick={() => onToggle(row)}>
      {publish ? <Eye size={18} aria-hidden="true" /> : <Archive size={18} aria-hidden="true" />}
    </button>
  </li>;
}

/** Primeiro cartão da grade: abre o cadastro. */
export function NewCollectibleCard({ label, onCreate }: { label: string; onCreate: () => void }) {
  return <li className="collectible-card-cell">
    <button type="button" className="collectible-card is-new" onClick={onCreate}>
      <Plus size={28} aria-hidden="true" />
      <strong>{label}</strong>
    </button>
  </li>;
}

/** Silhuetas enquanto a lista carrega. */
export function CollectibleSkeletons({ count = 8 }: { count?: number }) {
  return <>{Array.from({ length: count }, (_, index) => <li key={index} className="collectible-card-cell" aria-hidden="true"><span className="collectible-card is-skeleton"><i /><i /><i /></span></li>)}</>;
}
