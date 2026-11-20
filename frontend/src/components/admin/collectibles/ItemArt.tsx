import { useState } from 'react';
import { SlidersHorizontal } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { uploadCollectibleArt } from '@/services/adminCollectibles';
import { isThemeSlot, type ItemForm as ItemFormState } from './adminCollectiblesForm';
import { slotLabel } from './adminCollectiblesModel';
import { AdjustPanel } from './AdjustPanel';
import { ArtUploadField } from './ArtUploadField';
import { FieldError } from './FormSection';

interface ItemArtProps { value: ItemFormState; error?: string; onChange: (change: Partial<ItemFormState>) => void }

/** Envio da arte e, só nos encaixes do personagem, o ajuste fino. Fundo e tema do card cobrem a área toda e não têm ajuste. */
export function ItemArt({ value, error, onChange }: ItemArtProps) {
  const [adjusting, setAdjusting] = useState(false);
  const slot = slotLabel(value.type);
  const name = value.name.trim() || slot;
  const adjustable = !isThemeSlot(value.type);
  const open = adjusting && adjustable;
  const upload = async (file: File) => { const art = await uploadCollectibleArt(file); onChange({ artKey: art.artKey, artUrl: art.artUrl }); };
  return <>
    <div className="collectible-art-row">
      <ArtUploadField name={slot} artKey={value.artKey} artUrl={value.artUrl} onUpload={upload} />
      {adjustable && <AppButton variant="ghost" size="control" className="collectible-icon-button" icon={<SlidersHorizontal size={16} aria-hidden="true" />} aria-label={`Ajustar posição de ${name}`} title="Ajustar posição" aria-expanded={adjusting} aria-controls="collectible-adjust-item" onClick={() => setAdjusting((previous) => !previous)} />}
    </div>
    {open && <AdjustPanel id="collectible-adjust-item" name={name} adjust={value.adjust} onAdjust={(adjust) => onChange({ adjust })} error={error}
      layer={value.type === 'effect' ? value.layer : undefined} onLayer={(layer) => onChange({ layer })} />}
    {!open && <FieldError>{error}</FieldError>}
  </>;
}
