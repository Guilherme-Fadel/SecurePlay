import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { uploadCollectibleArt } from '@/services/adminCollectibles';
import type { CollectibleSlotType } from '@/services/adminCollectibles';
import type { FormErrors, PieceDraft } from './adminCollectiblesForm';
import { slotLabel } from './adminCollectiblesModel';
import { AdjustPanel } from './AdjustPanel';
import { ArtUploadField } from './ArtUploadField';
import { FieldError } from './FormSection';

interface KitPiecesGridProps {
  pieces: PieceDraft[];
  errors: FormErrors;
  onPiece: (type: CollectibleSlotType, patch: Partial<PieceDraft>) => void;
}

interface RowProps { piece: PieceDraft; error?: string; adjusting: boolean; onToggleAdjust: () => void; onPatch: (patch: Partial<PieceDraft>) => void }

function PieceRow({ piece, error, adjusting, onToggleAdjust, onPatch }: RowProps) {
  const slot = slotLabel(piece.type);
  const name = piece.name.trim() || slot;
  const panelId = `collectible-adjust-${piece.type}`;
  const upload = async (file: File) => { const art = await uploadCollectibleArt(file); onPatch({ artKey: art.artKey, artUrl: art.artUrl }); };
  return <div className="collectible-piece-row" role="listitem">
    <label className="collectible-piece-on"><input type="checkbox" checked={piece.on} onChange={(event) => onPatch({ on: event.target.checked })} />{slot}</label>
    <AppInput aria-label={`Nome da peça ${slot}`} placeholder="Nome da peça" maxLength={120} value={piece.name} disabled={!piece.on} aria-invalid={error ? true : undefined} onChange={(event) => onPatch({ name: event.target.value })} />
    <ArtUploadField name={slot} artKey={piece.artKey} artUrl={piece.artUrl} disabled={!piece.on} onUpload={upload} />
    <AppButton variant="ghost" size="control" className="collectible-icon-button" icon={<SlidersHorizontal size={16} aria-hidden="true" />} aria-label={`Ajustar posição de ${name}`} title="Ajustar posição" aria-expanded={adjusting} aria-controls={panelId} disabled={!piece.on} onClick={onToggleAdjust} />
    {!piece.on && piece.id !== undefined && <p className="collectible-piece-note" role="status">Esta peça sai do kit ao salvar. Quem já a tem continua com ela.</p>}
    <FieldError>{error}</FieldError>
    {adjusting && piece.on && <div className="collectible-adjust-slot"><AdjustPanel id={panelId} name={name} adjust={piece.adjust} onAdjust={(adjust) => onPatch({ adjust })} layer={piece.type === 'effect' ? piece.layer : undefined} onLayer={(layer) => onPatch({ layer })} /></div>}
  </div>;
}

/** Grade fixa de peças: uma linha por encaixe (Skin, Cabeça, Rosto, Pescoço, Efeito). */
export function KitPiecesGrid({ pieces, errors, onPiece }: KitPiecesGridProps) {
  const [adjusting, setAdjusting] = useState<CollectibleSlotType | null>(null);
  return <div className="collectible-piece-grid" role="list" aria-label="Peças do kit">
    <div className="collectible-piece-row is-head" aria-hidden="true"><span>Incluir</span><span>Nome</span><span>Arte</span><span>Estado</span><span /></div>
    {pieces.map((piece) => <PieceRow key={piece.type} piece={piece} error={errors[`piece:${piece.type}`]} adjusting={adjusting === piece.type}
      onToggleAdjust={() => setAdjusting((current) => (current === piece.type ? null : piece.type))} onPatch={(patch) => onPiece(piece.type, patch)} />)}
  </div>;
}
