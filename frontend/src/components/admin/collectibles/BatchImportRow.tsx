import { PieceArtThumb } from '@/components/sections/HomePage/Awards/PieceArtThumb';
import '@/styles/character-fitting.css';
import type { BatchEntry } from './collectibleImport';
import { priceLabel, rarityName, slotLabel } from './adminCollectiblesModel';
import { rowStatus, type Existence, type Outcome } from './useBatchImport';

interface BatchImportRowProps {
  entry: BatchEntry;
  existence: Existence | undefined;
  outcome: Outcome | undefined;
  selectable: boolean;
  checked: boolean;
  /** Durante a criação (e depois dela) a escolha não muda mais. */
  locked: boolean;
  onToggle: (on: boolean) => void;
}

/** Miniatura da arte do arquivo (dataURL de PNG ou SVG, validado na leitura); sem arte mostra o aviso. */
function Thumb({ entry }: { entry: BatchEntry }) {
  if (!entry.ok || !entry.art) return <span className="collectible-import-noart">Sem arte</span>;
  const src = `data:${entry.art.type};base64,${entry.art.base64}`;
  // Mesmo recorte das miniaturas da loja: só o acessório, não a prancheta inteira (quase toda transparente).
  return <span className="collectible-import-thumb" role="img" aria-label={`Arte de ${entry.form.name}`}>
    <PieceArtThumb artUrl={src} fallback={<img className="collectible-import-whole" src={src} alt="" />} />
  </span>;
}

/** Uma linha da análise: escolha, arte, nome, encaixe, raridade, preço e situação. */
export function BatchImportRow({ entry, existence, outcome, selectable, checked, locked, onToggle }: BatchImportRowProps) {
  const name = entry.ok ? entry.form.name : entry.name ?? `Item ${entry.index + 1}`;
  const status = rowStatus(entry, existence, outcome);
  return <tr className={entry.ok ? undefined : 'is-invalid'}>
    <td data-label="Importar"><input type="checkbox" className="collectible-import-check" aria-label={`Importar ${name}`} checked={checked} disabled={!selectable || locked} onChange={(event) => onToggle(event.target.checked)} /></td>
    <td data-label="Arte"><Thumb entry={entry} /></td>
    <td data-label="Nome"><strong>{name}</strong></td>
    <td data-label="Encaixe">{entry.ok ? slotLabel(entry.form.type) : '—'}</td>
    <td data-label="Raridade">{entry.ok ? rarityName(entry.form.rarity) : '—'}</td>
    <td data-label="Preço">{entry.ok ? priceLabel(Number(entry.form.price)) : '—'}</td>
    <td data-label="Situação"><span className={`collectible-import-status is-${status.tone}`}>{status.text}</span></td>
  </tr>;
}
