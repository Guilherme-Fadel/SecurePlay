import fundoAcademiaArtwork from '@/assets/static/cosmetics/fundo-academia.png';
import fundoInvestigadorArtwork from '@/assets/static/cosmetics/fundo-investigador.png';
import efeitoAscensaoArtwork from '@/assets/static/cosmetics/efeito-ascensao.png';

/** Pixel art aprovada dos cosméticos, pelo slug do catálogo. */
const cosmeticArtwork: Record<string, string> = {
  'fundo-academia': fundoAcademiaArtwork,
  'fundo-investigador': fundoInvestigadorArtwork,
  'efeito-ascensao': efeitoAscensaoArtwork,
};

export const hasCosmeticArtwork = (slug: string) => slug in cosmeticArtwork;

/**
 * Arte do item em pixel art (sem suavização). Item novo sem arte no front
 * mostra a inicial do nome, como o ShopView fazia.
 */
export function CosmeticArt({ slug, name, size, alt = '', className = '' }: {
  slug: string;
  name: string;
  size: number;
  alt?: string;
  className?: string;
}) {
  const source = cosmeticArtwork[slug];
  if (!source) {
    return (
      <span className={`cole-art cole-art--fallback ${className}`.trim()} style={{ width: size, height: size }} role={alt ? 'img' : undefined} aria-label={alt || undefined} aria-hidden={alt ? undefined : true}>
        {name.charAt(0).toUpperCase()}
      </span>
    );
  }
  return (
    <img
      className={`cole-art ${className}`.trim()}
      src={source}
      alt={alt}
      aria-hidden={alt ? undefined : true}
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      draggable={false}
    />
  );
}
