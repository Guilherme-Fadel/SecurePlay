import { useState } from 'react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { AlbumArt } from './AlbumSticker';
import {
  collectionFan,
  collectionNextText,
  collectionRange,
  progressText,
  stickerAria,
  stickerDestination,
  stickerNumber,
  type Album,
  type AlbumCollection,
  type AlbumDestination,
  type AlbumFeatures,
  type AlbumSticker,
} from './albumModel';

const ALMOST_PREVIEW = 3;

interface AlbumHubProps {
  album: Album;
  almost: AlbumSticker[];
  features: AlbumFeatures;
  onOpenSticker: (sticker: AlbumSticker, trigger: HTMLButtonElement) => void;
  onOpenCollection: (category: string) => void;
  onGo: (destination: AlbumDestination) => void;
  registerCollection: (category: string, element: HTMLButtonElement | null) => void;
}

/** Visão geral do álbum: "Quase lá!" e a grade de coleções. */
export function AlbumHub({ album, almost, features, onOpenSticker, onOpenCollection, onGo, registerCollection }: AlbumHubProps) {
  const complete = album.total > 0 && album.stuck === album.total;
  return (
    <>
      {complete ? (
        <section className="al-band al-band--done" aria-labelledby="al-done-title">
          <span className="al-band-pet" aria-hidden="true"><BrandCharacter expression="happy" body="var(--sp-black)" face="var(--sp-yellow)" eyes="var(--sp-black)" /></span>
          <div>
            <h2 id="al-done-title" className="al-display al-band-title">Álbum completo!</h2>
            <p>Você colou todas as {album.total} figurinhas do álbum.</p>
          </div>
        </section>
      ) : almost.length > 0 ? (
        <AlmostThere almost={almost} features={features} onOpenSticker={onOpenSticker} onGo={onGo} />
      ) : null}

      {album.stuck === 0 && (
        <section className="al-note" aria-labelledby="al-first-title">
          <span className="al-note-pet" aria-hidden="true"><BrandCharacter expression="curious" /></span>
          <div>
            <h2 id="al-first-title" className="al-note-title">Seu álbum está esperando a primeira figurinha</h2>
            <p>Cada aula, missão e dia de sequência conta para colar figurinhas e ganhar Chaves Digitais.</p>
          </div>
        </section>
      )}

      <div className="al-sec-head">
        <h2 className="al-display al-sec-title">Coleções</h2>
        <p>{album.collections.length} {album.collections.length === 1 ? 'coleção' : 'coleções'} · abra uma para ver as figurinhas</p>
      </div>
      <ul className="al-collections">
        {album.collections.map((collection) => (
          <li key={collection.category}>
            <CollectionCard collection={collection} onOpen={onOpenCollection} register={registerCollection} />
          </li>
        ))}
      </ul>
    </>
  );
}

function AlmostThere({ almost, features, onOpenSticker, onGo }: {
  almost: AlbumSticker[];
  features: AlbumFeatures;
  onOpenSticker: AlbumHubProps['onOpenSticker'];
  onGo: AlbumHubProps['onGo'];
}) {
  const [expanded, setExpanded] = useState(false);
  const visible = expanded ? almost : almost.slice(0, ALMOST_PREVIEW);
  return (
    <section className="al-band" aria-labelledby="al-almost-title">
      <div className="al-band-head">
        <div>
          <h2 id="al-almost-title" className="al-display al-band-title">Quase lá!</h2>
          <p>Faltam poucos passos para colar estas figurinhas.</p>
        </div>
        {almost.length > ALMOST_PREVIEW && (
          <button type="button" className="al-band-toggle" aria-expanded={expanded} aria-controls="al-almost-list" onClick={() => setExpanded((value) => !value)}>
            {expanded ? 'Mostrar menos' : `Ver as ${almost.length} próximas`}
          </button>
        )}
      </div>
      <ul id="al-almost-list" className="al-almost">
        {visible.map((sticker) => {
          const destination = stickerDestination(sticker, features);
          return (
            <li key={sticker.node.slug} className="al-almost-card">
              <button
                type="button"
                className="al-almost-box"
                aria-label={stickerAria(sticker)}
                aria-haspopup="dialog"
                onClick={(event) => onOpenSticker(sticker, event.currentTarget)}
              >
                <AlbumArt sticker={sticker} />
              </button>
              <div className="al-almost-body">
                <span className="al-meta">{sticker.collectionLabel} · {stickerNumber(sticker.number)}</span>
                <span className="al-almost-name">{sticker.node.name}</span>
                <span className="al-bar" aria-hidden="true"><span style={{ width: `${sticker.percent}%` }} /></span>
                <span className="al-almost-progress">{progressText(sticker)} · {sticker.percent}%</span>
                {destination && (
                  <AppButton variant="chunky" tone="blue" size="sm" className="al-go" onClick={() => onGo(destination)}>
                    {destination.label}
                  </AppButton>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CollectionCard({ collection, onOpen, register }: {
  collection: AlbumCollection;
  onOpen: (category: string) => void;
  register: (category: string, element: HTMLButtonElement | null) => void;
}) {
  const fan = collectionFan(collection);
  return (
    <button
      type="button"
      className={`al-card${collection.complete ? ' is-complete' : ''}`}
      ref={(element) => register(collection.category, element)}
      aria-label={`${collection.label}, ${collection.stuck} de ${collection.total} coladas. Abrir coleção`}
      onClick={() => onOpen(collection.category)}
    >
      <span className="al-card-band">
        <span>
          <span className="al-display al-card-title">{collection.label}</span>
          <small>{collection.subtitle}</small>
        </span>
        <span className="al-card-range">{collectionRange(collection)}</span>
      </span>
      <span className="al-fan" aria-hidden="true">
        {fan.map(({ sticker, kind }) => (
          <span key={sticker.node.slug} className={`al-fan-item is-${kind}`}>
            <AlbumArt sticker={sticker} />
          </span>
        ))}
      </span>
      <span className="al-card-foot">
        <span className="al-card-count">{collection.stuck} de {collection.total} coladas</span>
        <Segments collection={collection} />
        <span className="al-card-next">
          {collection.complete ? <strong>Coleção completa</strong> : <>Próxima: <strong>{collectionNextText(collection)}</strong></>}
        </span>
      </span>
    </button>
  );
}

export function Segments({ collection }: { collection: AlbumCollection }) {
  return (
    <span className="al-segs" aria-hidden="true">
      {collection.stickers.map((sticker) => (
        <span key={sticker.node.slug} className={`al-seg${sticker.state === 'stuck' ? ' is-on' : sticker.state === 'next' ? ' is-next' : ''}`} />
      ))}
    </span>
  );
}
