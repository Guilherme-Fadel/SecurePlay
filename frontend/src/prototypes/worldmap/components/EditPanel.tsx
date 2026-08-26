import { useState } from 'react';
import type { Biome } from '../types';

interface EditPanelProps {
  // bioma atual (null = estamos no mapa global editando hotspots)
  biome: Biome | null;
  biomes: Biome[];
}

// Painel do modo edicao. Gera um snippet pronto para colar no mockData.ts.
// - No mapa global (biome null): lista as posicoes dos hotspots dos biomas.
// - Dentro de um bioma: lista as posicoes das fases daquele bioma.
export function EditPanel({ biome, biomes }: EditPanelProps) {
  const [copied, setCopied] = useState(false);

  const title = biome ? `Fases (${biome.name})` : 'Hotspots (Mapa Global)';

  const snippet = biome
    ? biome.levels
        .map(
          (l) =>
            `  { id: ${l.id}, position: { x: ${l.position.x}, y: ${l.position.y} } },`,
        )
        .join('\n')
    : biomes
        .map(
          (b) =>
            `  ${b.id.padEnd(9)} hotspot: { x: ${b.hotspot.x}, y: ${b.hotspot.y} },`,
        )
        .join('\n');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  };

  return (
    <div className="wm-edit-panel">
      <div className="wm-edit-panel-head">
        <strong>{title}</strong>
        <button onClick={handleCopy}>{copied ? 'Copiado!' : 'Copiar'}</button>
      </div>
      <p className="wm-edit-hint">
        {biome
          ? 'Arraste as fases e copie os valores para o mockData.ts.'
          : 'Arraste os biomas e copie os valores para o mockData.ts.'}
      </p>
      <pre className="wm-edit-code">{snippet}</pre>
    </div>
  );
}
