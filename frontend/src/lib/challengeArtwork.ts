import { getGameArtwork } from './staticArtwork';

export function getChallengeArtwork(image: string | null | undefined, slug: string): string {
  return getGameArtwork(image?.trim(), slug);
}
