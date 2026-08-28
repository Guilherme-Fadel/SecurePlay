/**
 * Utilidades para derivação de paleta de cores a partir de uma cor primária.
 * Usa HSL para manipulação coerente.
 */

export interface DerivedPalette {
  primary: string;
  secondary: string;
  accent: string;
  text_primary: string;
  text_secondary: string;
}

function hexToHsl(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return [0, 0, 0];

  let r = parseInt(result[1], 16) / 255;
  let g = parseInt(result[2], 16) / 255;
  let b = parseInt(result[3], 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;

  let r = 0, g = 0, b = 0;

  if (h < 60) { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else { r = c; g = 0; b = x; }

  const toHex = (n: number) => {
    const hex = Math.round((n + m) * 255).toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  };

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

/**
 * Deriva uma paleta completa a partir de uma cor primária (hex).
 * - secondary: hue shift +180° (complementar), luminosidade ajustada
 * - accent: hue shift +60° (análoga), saturação alta
 * - text_primary: branco ou preto conforme luminosidade da primary
 * - text_secondary: cinza claro ou escuro
 */
export function derivePalette(primaryHex: string): DerivedPalette {
  const [h, s, l] = hexToHsl(primaryHex);

  const secondary = hslToHex((h + 180) % 360, Math.min(s, 80), Math.max(l, 40));
  const accent = hslToHex((h + 60) % 360, Math.min(s + 10, 100), Math.min(l + 10, 60));

  // Texto baseado na luminosidade: se a primary é escura, textos claros e vice-versa
  const isDark = l < 50;
  const text_primary = isDark ? '#ECECEC' : '#1E293B';
  const text_secondary = isDark ? '#94a3b8' : '#475569';

  return {
    primary: primaryHex.startsWith('#') ? primaryHex : `#${primaryHex}`,
    secondary,
    accent,
    text_primary,
    text_secondary,
  };
}
