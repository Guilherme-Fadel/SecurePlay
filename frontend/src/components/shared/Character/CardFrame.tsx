import { useEffect, useMemo, useRef, useState } from 'react';
import { CARD_ART_HEIGHT, CARD_ART_WIDTH, cardFrameParts } from './cardFrameParts';
import { useArtBounds } from './useArtBounds';

interface Size { width: number; height: number }

const NO_SIZE: Size = { width: 0, height: 0 };

/** Tamanho em px do elemento, acompanhado por `ResizeObserver`. */
function useElementSize<T extends Element>(ref: { current: T | null }): Size {
  const [size, setSize] = useState<Size>(NO_SIZE);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(([entry]) => {
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setSize((current) => (current.width === width && current.height === height ? current : { width, height }));
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * Moldura do tema do card: a arte enviada por cima do card, na proporção original. Sobrando largura, só as
 * barras de cima e de baixo se prolongam; os cantos e o enfeite do meio ficam intactos. Filho do card.
 */
export function CardFrame({ artUrl }: { artUrl: string | null }) {
  const ref = useRef<SVGSVGElement>(null);
  const size = useElementSize(ref);
  const art = useArtBounds(artUrl);
  const bounds = art.status === 'ready' ? art.bounds : null;
  const parts = useMemo(
    () => (bounds && size.width > 0 && size.height > 0 ? cardFrameParts(bounds, size.width, size.height) : []),
    [bounds, size.width, size.height],
  );

  return (
    <svg
      ref={ref}
      aria-hidden="true"
      focusable="false"
      viewBox={`0 0 ${size.width || 1} ${size.height || 1}`}
      style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 1, overflow: 'visible' }}
    >
      {artUrl && parts.map((part, index) => (
        <svg
          key={index}
          x={part.dx}
          y={part.dy}
          width={part.dw}
          height={part.dh}
          viewBox={`${part.sx} ${part.sy} ${part.sw} ${part.sh}`}
          preserveAspectRatio="none"
        >
          <image href={artUrl} width={CARD_ART_WIDTH} height={CARD_ART_HEIGHT} preserveAspectRatio="none" />
        </svg>
      ))}
    </svg>
  );
}
