import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useSectionContext } from '@/contexts/SectionContext';
import type { AchievementTrail } from '@/services/achievements';
import { AlbumHub } from './AlbumHub';
import { AlbumCollection } from './AlbumCollection';
import { AlbumDetail } from './AlbumDetail';
import { AlbumLoading, AlbumState } from './AlbumStates';
import {
  almostThere,
  buildAlbum,
  stickerDestination,
  type Album,
  type AlbumCollection as AlbumCollectionData,
  type AlbumDestination,
  type AlbumFeatures,
  type AlbumSticker,
} from './albumModel';

interface AlbumViewProps {
  trail: AchievementTrail | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
  enabled: boolean;
  features: AlbumFeatures;
  /** Coleção aberta, vinda da URL (`?colecao=`). */
  collection: string | null;
  onCollectionChange: (category: string | null) => void;
}

export function AlbumView({ trail, loading, error, refetch, enabled, features, collection, onCollectionChange }: AlbumViewProps) {
  const album = useMemo(() => buildAlbum(trail?.nodes ?? []), [trail]);
  const status = albumStatus({ enabled, loading, error, trail, album, refetch });
  if (status) return status;
  return <AlbumContent album={album} features={features} collection={collection} onCollectionChange={onCollectionChange} />;
}

/** Carregando, erro, desligado e catálogo vazio são exclusivos: não mostram dados antigos pela metade. */
function albumStatus({ enabled, loading, error, trail, album, refetch }: {
  enabled: boolean;
  loading: boolean;
  error: string | null;
  trail: AchievementTrail | null;
  album: Album;
  refetch: () => void;
}): ReactNode {
  if (!enabled) {
    return (
      <AlbumState title="Conquistas indisponíveis" expression="curious">
        As conquistas não estão habilitadas para a sua escola.
      </AlbumState>
    );
  }
  if (trail === null && error && !loading) {
    return (
      <AlbumState title="Não foi possível carregar o álbum" expression="surprised" kind="alert" onRetry={refetch}>
        Tente novamente para sincronizar suas figurinhas.
      </AlbumState>
    );
  }
  if (trail === null) return <AlbumLoading />;
  if (album.total === 0) {
    return (
      <AlbumState title="Álbum aguardando figurinhas" expression="curious">
        As coleções aparecem aqui quando o catálogo de conquistas for configurado.
      </AlbumState>
    );
  }
  return null;
}

function AlbumContent({ album, features, collection, onCollectionChange }: {
  album: Album;
  features: AlbumFeatures;
  collection: string | null;
  onCollectionChange: (category: string | null) => void;
}) {
  const { navigateToSection } = useSectionContext();
  const almost = useMemo(() => almostThere(album), [album]);
  const openCollection = album.collections.find((item) => item.category === collection) ?? null;
  const focus = useCollectionFocus(openCollection);
  const dialog = useStickerDialog(album);
  const go = (destination: AlbumDestination) => navigateToSection(destination.section);

  return (
    <>
      {openCollection ? (
        <AlbumCollection
          key={openCollection.category}
          collection={openCollection}
          headingRef={focus.headingRef}
          onBack={() => { focus.returnTo(openCollection.category); onCollectionChange(null); }}
          onOpenSticker={dialog.open}
        />
      ) : (
        <AlbumHub
          album={album}
          almost={almost}
          features={features}
          onOpenSticker={dialog.open}
          onOpenCollection={(category) => { focus.toHeading(); onCollectionChange(category); }}
          onGo={go}
          registerCollection={focus.registerCollection}
        />
      )}
      {dialog.selected && (
        <AlbumDetail
          key={dialog.selected.node.slug}
          sticker={dialog.selected}
          album={album}
          destination={stickerDestination(dialog.selected, features)}
          onClose={dialog.close}
          onGo={go}
        />
      )}
    </>
  );
}

/** Ao abrir uma coleção, o foco vai para o título; ao voltar, para o cartão aberto. */
function useCollectionFocus(openCollection: AlbumCollectionData | null) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  const cards = useRef(new Map<string, HTMLButtonElement>());
  const pending = useRef<{ kind: 'heading' } | { kind: 'card'; category: string } | null>(null);

  useEffect(() => {
    const target = pending.current;
    if (!target) return;
    pending.current = null;
    if (target.kind === 'heading') headingRef.current?.focus();
    else cards.current.get(target.category)?.focus();
  }, [openCollection]);

  const registerCollection = useCallback((category: string, element: HTMLButtonElement | null) => {
    if (element) cards.current.set(category, element);
    else cards.current.delete(category);
  }, []);

  return {
    headingRef,
    registerCollection,
    toHeading: () => { pending.current = { kind: 'heading' }; },
    returnTo: (category: string) => { pending.current = { kind: 'card', category }; },
  };
}

/** Figurinha aberta pelo slug (sobrevive à atualização periódica da trilha) e foco de volta a quem abriu. */
function useStickerDialog(album: Album) {
  const [slug, setSlug] = useState<string | null>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const selected = slug ? album.stickers.find((sticker) => sticker.node.slug === slug) ?? null : null;

  const open = (sticker: AlbumSticker, element: HTMLButtonElement) => {
    trigger.current = element;
    setSlug(sticker.node.slug);
  };
  const close = () => {
    setSlug(null);
    const element = trigger.current;
    trigger.current = null;
    if (element?.isConnected) element.focus();
  };
  return { selected, open, close };
}
