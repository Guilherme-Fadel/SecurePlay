const pixelArtwork: Record<string, string> = {
  'caca-phishing': '/challenges/caca-phishing-pixel.png',
  termotech: '/challenges/termotech-pixel.png',
  'quiz-relampago': '/challenges/quiz-relampago-pixel.png',
  'classificacao-dados': '/challenges/classificacao-dados-pixel.png',
};

/** Replace bundled placeholders, but keep custom API/CDN artwork. */
export function getChallengeArtwork(image: string | null | undefined, slug: string): string {
  const source = image?.trim();
  const localPlaceholder = source?.match(/^\/challenges\/(caca-phishing|termotech|quiz-relampago|classificacao-dados)\.(svg|png)$/);
  if (localPlaceholder) return pixelArtwork[localPlaceholder[1]];
  return source || pixelArtwork[slug] || '';
}
