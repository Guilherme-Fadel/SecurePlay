const preloaded = new Set<string>();

export function preloadImages(urls: Array<string | null | undefined>) {
  for (const url of urls) {
    if (!url || !/^(https?:\/\/|\/)/.test(url) || preloaded.has(url)) continue;
    preloaded.add(url);
    const image = new Image();
    image.decoding = 'async';
    image.src = url;
  }
}
