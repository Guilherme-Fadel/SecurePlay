export interface ArtBounds { x: number; y: number; w: number; h: number }

/**
 * Retângulo (em fração 0..1 da imagem) dos pixels com alfa acima do limite.
 * `data` é o RGBA de `getImageData`. Devolve `null` quando a imagem é vazia.
 */
export function alphaBounds(data: Uint8ClampedArray, width: number, height: number, threshold = 16): ArtBounds | null {
  if (width <= 0 || height <= 0 || data.length < width * height * 4) return null;
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < height; y += 1) {
    const row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      if (data[row + x * 4 + 3] <= threshold) continue;
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
  if (maxX < 0) return null;
  return { x: minX / width, y: minY / height, w: (maxX - minX + 1) / width, h: (maxY - minY + 1) / height };
}

/** Acrescenta margem proporcional (fração da própria caixa) e limita ao interior da imagem. */
export function framedBounds(bounds: ArtBounds, pad = 0.04): ArtBounds {
  const padX = bounds.w * pad;
  const padY = bounds.h * pad;
  const x = Math.max(0, bounds.x - padX);
  const y = Math.max(0, bounds.y - padY);
  const right = Math.min(1, bounds.x + bounds.w + padX);
  const bottom = Math.min(1, bounds.y + bounds.h + padY);
  return { x, y, w: right - x, h: bottom - y };
}
