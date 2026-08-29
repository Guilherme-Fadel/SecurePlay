import { useState } from 'react';
import type { Biome, Position } from '../types';
interface RegionEditPanelProps {
    biomes: Biome[];
    editingBiomeId: string | null;
    draftPoints: Position[];
    onPickBiome: (biomeId: string) => void;
    onUndo: () => void;
    onClear: () => void;
    onSave: () => Promise<boolean> | void;
}
export function RegionEditPanel({ biomes, editingBiomeId, draftPoints, onPickBiome, onUndo, onClear, onSave, }: RegionEditPanelProps) {
    const [copied, setCopied] = useState(false);
    const [saveState, setSaveState] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const handleSave = async () => {
        setSaveState('saving');
        const ok = await onSave();
        setSaveState(ok ? 'saved' : 'error');
        setTimeout(() => setSaveState('idle'), 2000);
    };
    const snippet = editingBiomeId
        ? `region: [\n${draftPoints
            .map((p) => `  { x: ${p.x}, y: ${p.y} },`)
            .join('\n')}\n],`
        : '';
    const handleCopy = async () => {
        if (!snippet)
            return;
        try {
            await navigator.clipboard.writeText(snippet);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        }
        catch {
            setCopied(false);
        }
    };
    return (<div className="wm-edit-panel wm-region-panel">
      <div className="wm-edit-panel-head">
        <strong>Regioes dos biomas</strong>
      </div>

      <p className="wm-edit-hint">
        1) Escolha o bioma. 2) Segure o mouse e contorne o bioma (ou clique
        ponto a ponto). 3) Salvar e copiar para o mockData.ts.
      </p>

      <div className="wm-region-biomes">
        {biomes.map((b) => (<button key={b.id} className={`wm-region-pick ${editingBiomeId === b.id ? 'active' : ''}`} style={{
                borderColor: b.accent,
                background: editingBiomeId === b.id ? `${b.accent}33` : undefined,
            }} onClick={() => onPickBiome(b.id)}>
            {b.name}
            {b.region && b.region.length >= 3 ? ' (ok)' : ''}
          </button>))}
      </div>

      {editingBiomeId && (<>
          <div className="wm-region-actions">
            <span>{draftPoints.length} pontos</span>
            <button onClick={onUndo} disabled={!draftPoints.length}>
              Desfazer
            </button>
            <button onClick={onClear} disabled={!draftPoints.length}>
              Limpar
            </button>
            <button className="wm-region-save" onClick={handleSave} disabled={draftPoints.length < 3 || saveState === 'saving'}>
              {saveState === 'saving'
                ? 'Salvando...'
                : saveState === 'saved'
                    ? 'Salvo no codigo!'
                    : saveState === 'error'
                        ? 'Erro ao salvar'
                        : 'Salvar'}
            </button>
          </div>

          <div className="wm-edit-panel-head" style={{ marginTop: 8 }}>
            <strong>Snippet</strong>
            <button onClick={handleCopy} disabled={draftPoints.length < 3}>
              {copied ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
          <pre className="wm-edit-code">{snippet}</pre>
        </>)}
    </div>);
}
