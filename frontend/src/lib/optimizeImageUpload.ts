interface OptimizeImageOptions {
  maxWidth: number;
  maxHeight: number;
  quality?: number;
}

function canvasToWebp(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error("O navegador não conseguiu otimizar a imagem."));
      },
      "image/webp",
      quality,
    );
  });
}

/**
 * Redimensiona logos e avatares antes do envio. Se a conversão não trouxer
 * benefício, preserva o arquivo original e seu Content-Type.
 */
export async function optimizeImageUpload(
  file: File,
  { maxWidth, maxHeight, quality = 0.82 }: OptimizeImageOptions,
): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;
  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(
      1,
      maxWidth / bitmap.width,
      maxHeight / bitmap.height,
    );
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext("2d");
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, width, height);

    const optimized = await canvasToWebp(canvas, quality);
    const wasResized = width !== bitmap.width || height !== bitmap.height;
    if (!wasResized && optimized.size >= file.size) return file;

    const basename = file.name.replace(/\.[^.]+$/, "") || "image";
    return new File([optimized], `${basename}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } catch {
    // Browsers antigos ou imagens incomuns continuam usando o fluxo original.
    return file;
  } finally {
    bitmap?.close();
  }
}
