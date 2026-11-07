import { AppFilterChip } from '@/components/ui/buttons/AppFilterChip';
import { useState, type RefObject } from 'react';
import { ChevronLeft } from 'lucide-react';
import { AlbumSlot } from './AlbumSticker';
import { Segments } from './AlbumHub';
import {
  FILTERS,
  collectionRange,
  filterCounts,
  filterStickers,
  type AlbumCollection as AlbumCollectionData,
  type AlbumSticker,
  type StickerFilter,
} from './albumModel';

/** Página de uma coleção: faixa, filtros e figurinhas nos quatro estados. */
export function AlbumCollection({ collection, headingRef, onBack, onOpenSticker }: {
  collection: AlbumCollectionData;
  headingRef: RefObject<HTMLHeadingElement>;
  onBack: () => void;
  onOpenSticker: (sticker: AlbumSticker, trigger: HTMLButtonElement) => void;
}) {
  const [filter, setFilter] = useState<StickerFilter>('all');
  const counts = filterCounts(collection.stickers);
  const shown = filterStickers(collection.stickers, filter);
  return (
    <>
      <button type="button" className="al-back" onClick={onBack}>
        <ChevronLeft size={20} aria-hidden="true" />
        Todas as coleções
      </button>
      <section className={`al-cover${collection.complete ? ' is-complete' : ''}`} aria-labelledby="al-collection-title">
        <div>
          <h2 id="al-collection-title" ref={headingRef} tabIndex={-1} className="al-display al-cover-title">{collection.label}</h2>
          <p>{collection.subtitle} · {collectionRange(collection)}</p>
        </div>
        <div className="al-cover-progress">
          <strong>{collection.stuck} de {collection.total} coladas</strong>
          <Segments collection={collection} />
        </div>
      </section>
      <div className="al-chips" role="group" aria-label="Filtrar figurinhas da coleção">
        {FILTERS.map(({ value, label }) => (
          // AppFilterChip (UI-GUIDELINES) com a variante visual do álbum em .al-chip.
          <AppFilterChip key={value} className="al-chip" selected={filter === value} onClick={() => setFilter(value)}>
            {label} <small>{counts[value]}</small>
          </AppFilterChip>
        ))}
      </div>
      <div className="al-page">
        {shown.length === 0 ? (
          <p className="al-page-empty" role="status">Nenhuma figurinha com esse filtro nesta coleção.</p>
        ) : (
          <ul className="al-slots" aria-label={`Figurinhas de ${collection.label}`}>
            {shown.map((sticker) => <AlbumSlot key={sticker.node.slug} sticker={sticker} onOpen={onOpenSticker} />)}
          </ul>
        )}
      </div>
    </>
  );
}
