import molduraVioletaArtwork from '@/assets/static/cosmetics/moldura-violeta.png';
import molduraSentinelaArtwork from '@/assets/static/cosmetics/moldura-sentinela.png';
import molduraEliteArtwork from '@/assets/static/cosmetics/moldura-elite.png';
import fundoAcademiaArtwork from '@/assets/static/cosmetics/fundo-academia.png';
import fundoInvestigadorArtwork from '@/assets/static/cosmetics/fundo-investigador.png';
import tituloAprendizArtwork from '@/assets/static/cosmetics/titulo-aprendiz.png';
import tituloSentinelaArtwork from '@/assets/static/cosmetics/titulo-sentinela.png';
import emblemaChamaArtwork from '@/assets/static/cosmetics/emblema-chama.png';
import emblemaInvestigadorArtwork from '@/assets/static/cosmetics/emblema-investigador.png';
import efeitoAscensaoArtwork from '@/assets/static/cosmetics/efeito-ascensao.png';

/** Pixel art aprovada dos cosméticos, pelo slug do catálogo. */
const cosmeticArtwork: Record<string, string> = {
  'moldura-violeta': molduraVioletaArtwork,
  'moldura-sentinela': molduraSentinelaArtwork,
  'moldura-elite': molduraEliteArtwork,
  'fundo-academia': fundoAcademiaArtwork,
  'fundo-investigador': fundoInvestigadorArtwork,
  'titulo-aprendiz': tituloAprendizArtwork,
  'titulo-sentinela': tituloSentinelaArtwork,
  'emblema-chama': emblemaChamaArtwork,
  'emblema-investigador': emblemaInvestigadorArtwork,
  'efeito-ascensao': efeitoAscensaoArtwork,
};

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
