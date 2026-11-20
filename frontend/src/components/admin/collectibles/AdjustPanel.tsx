import { RotateCcw } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { CollectibleLayer } from '@/services/adminCollectibles';
import { ADJUST_SCALE, type AdjustDraft } from './adminCollectiblesForm';
import { FieldError } from './FormSection';

interface AdjustPanelProps {
  id: string;
  /** Nome da peça, para o grupo acessível. */
  name: string;
  adjust: AdjustDraft;
  onAdjust: (adjust: AdjustDraft) => void;
  /** Efeito escolhe também a camada; os demais encaixes têm camada fixa. */
  layer?: CollectibleLayer;
  onLayer?: (layer: CollectibleLayer) => void;
  error?: string;
}

const RESET: AdjustDraft = { x: '0', y: '0', scale: '1' };

/** Ajuste fino (x, y em unidades do personagem e escala de 0,1 a 5): bloco expandido sob a linha; a prévia atualiza ao vivo. */
export function AdjustPanel({ id, name, adjust, onAdjust, layer, onLayer, error }: AdjustPanelProps) {
  const set = (field: keyof AdjustDraft) => (value: string) => onAdjust({ ...adjust, [field]: value });
  return <div id={id} className="collectible-adjust" role="group" aria-label={`Ajuste fino de ${name}`}>
    <div className="collectible-adjust-fields">
      <label className="admin-console-setting-field"><span>Horizontal (x)</span><input className="app-text-input" type="number" step={1} value={adjust.x} onChange={(event) => set('x')(event.target.value)} /></label>
      <label className="admin-console-setting-field"><span>Vertical (y)</span><input className="app-text-input" type="number" step={1} value={adjust.y} onChange={(event) => set('y')(event.target.value)} /></label>
      <label className="admin-console-setting-field"><span>Escala</span><input className="app-text-input" type="number" min={ADJUST_SCALE.min} max={ADJUST_SCALE.max} step={ADJUST_SCALE.step} value={adjust.scale} onChange={(event) => set('scale')(event.target.value)} /></label>
      {layer && onLayer && <label className="admin-console-setting-field"><span>Camada</span>
        <AppSelect aria-label="Camada do efeito" value={layer} onChange={(event) => onLayer(event.target.value === 'back' ? 'back' : 'front')}>
          <option value="back">Atrás do personagem</option>
          <option value="front">Na frente</option>
        </AppSelect>
      </label>}
    </div>
    <FieldError>{error}</FieldError>
    <div className="collectible-adjust-actions">
      <AppButton variant="ghost" size="control" icon={<RotateCcw size={16} aria-hidden="true" />} onClick={() => onAdjust({ ...RESET })}>Restaurar</AppButton>
    </div>
  </div>;
}
