import type { CSSProperties, ReactNode } from 'react';
import { framedBounds } from '@/components/shared/Character/artBounds';
import { ARTBOARD } from '@/components/shared/Character/characterLook';
import { useArtBounds } from '@/components/shared/Character/useArtBounds';

/**
 * Miniatura só do acessório enviado: recorta a arte da prancheta do personagem pela
 * caixa dos pixels visíveis. Enquanto mede mostra a imagem inteira; `fallback` deixa o
 * chamador voltar ao personagem vestindo a peça. As duas `<img>` pedem a arte em modo CORS, como a
 * medição: assim o cache do navegador não guarda uma resposta sem CORS que estragaria a leitura do canvas.
 */
export function PieceArtThumb({ artUrl, fallback }: { artUrl: string; fallback: ReactNode }) {
  const state = useArtBounds(artUrl);
  if (state.status === 'failed') return <>{fallback}</>;
  if (state.status === 'loading') {
    return <span className="chr-thumb chr-thumb--art" aria-hidden="true"><img className="chr-art-whole" src={artUrl} alt="" decoding="async" crossOrigin="anonymous" /></span>;
  }
  const { x, y, w, h } = framedBounds(state.bounds);
  const style: CSSProperties & Record<'--art-ratio', number> = { '--art-ratio': (w * ARTBOARD.width) / (h * ARTBOARD.height) };
  const imageStyle: CSSProperties = { width: `${100 / w}%`, left: `${(-x / w) * 100}%`, top: `${(-y / h) * 100}%` };
  return (
    <span className="chr-thumb chr-thumb--art" aria-hidden="true">
      <span className="chr-art-crop" style={style}><img src={artUrl} alt="" decoding="async" crossOrigin="anonymous" style={imageStyle} /></span>
    </span>
  );
}
