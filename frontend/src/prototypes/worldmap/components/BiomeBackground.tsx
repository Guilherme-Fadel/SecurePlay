import type { Biome } from '../types';

interface BiomeBackgroundProps {
  biome: Biome;
  // 'art'     -> arte do bioma dentro do wrap (padrao)
  // 'ambient' -> copia borrada cobrindo a tela toda (preenche as laterais)
  variant?: 'art' | 'ambient';
}

// Fundo do bioma (tela de zoom).
// TROCAR DEPOIS: quando as imagens/videos pixel art de cada bioma chegarem,
// substituir o gradiente abaixo por <img>/<video> (arte) e usar a mesma
// fonte borrada na variante 'ambient'.
export function BiomeBackground({ biome, variant = 'art' }: BiomeBackgroundProps) {
  const background = `
    radial-gradient(120% 90% at 50% 20%, ${biome.color}cc 0%, ${biome.color}66 45%, #0b0f1a 100%),
    repeating-linear-gradient(0deg, transparent 0 30px, ${biome.accent}11 30px 31px),
    repeating-linear-gradient(90deg, transparent 0 30px, ${biome.accent}11 30px 31px)
  `;

  if (variant === 'ambient') {
    return <div className="wm-biome-ambient" style={{ background }} />;
  }

  return (
    <div className="wm-biome-bg" style={{ background }}>
      <span className="wm-placeholder-tag">PLACEHOLDER: {biome.name}</span>
    </div>
  );
}
