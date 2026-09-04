const preloaded = new Set<string>();

export function preloadImages(urls: Array<string | null | undefined>) {
  void preloadImagesInBackground(urls);
}

function loadImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image();
    image.decoding = "async";
    image.fetchPriority = "low";
    const timeout = window.setTimeout(() => finish(false), 30_000);
    const finish = (loaded: boolean) => {
      window.clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      resolve(loaded);
    };
    image.onload = () => finish(true);
    image.onerror = () => finish(false);
    image.src = url;
  });
}

/** Aquece o cache HTTP sem abrir dezenas de conexões ao mesmo tempo. */
export async function preloadImagesInBackground(
  urls: Array<string | null | undefined>,
  concurrency = 4,
) {
  const queue = Array.from(
    new Set(
      urls.filter(
        (url): url is string =>
          Boolean(url) &&
          /^(https?:\/\/|\/)/.test(url as string) &&
          !preloaded.has(url as string),
      ),
    ),
  );
  queue.forEach((url) => preloaded.add(url));

  let nextIndex = 0;
  const worker = async () => {
    while (nextIndex < queue.length) {
      const url = queue[nextIndex++];
      if (!(await loadImage(url))) preloaded.delete(url);
    }
  };
  const workerCount = Math.min(Math.max(1, concurrency), queue.length);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
