const pixelArtwork: Record<string, string> = {
  worldmap: '/challenges/worldmap-pixel.png',
  'caca-phishing': '/challenges/caca-phishing-pixel.png',
  termotech: '/challenges/termotech-pixel.png',
  'quiz-relampago': '/challenges/quiz-relampago-pixel.png',
  'classificacao-dados': '/challenges/classificacao-dados-pixel.png',
};

/** Replace bundled placeholders, but keep custom API/CDN artwork. */
export function getChallengeArtwork(image: string | null | undefined, slug: string): string {
  const source = image?.trim();
  if (slug === 'worldmap' && source === '/prototypes/worldmap/global-map.png') return pixelArtwork.worldmap;
  const localPlaceholder = source?.match(/^\/challenges\/(caca-phishing|termotech|quiz-relampago|classificacao-dados)\.(svg|png)$/);
  if (localPlaceholder) return pixelArtwork[localPlaceholder[1]];
  return source || pixelArtwork[slug] || '';
}
