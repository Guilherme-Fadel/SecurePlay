import { useEffect } from 'react';
import { fetchCached } from '@/lib/queryCache';
import { preloadImages } from '@/lib/imageCache';
import { getModulos } from '@/services/conteudo';
import { getArcadeGames } from '@/services/arcade';
import { getAchievementTrail } from '@/services/achievements';
import { loadMissionRoomAssets } from './useMissionRoomAssets';

export function useVisualPreload() {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadMissionRoomAssets().then((assets) => preloadImages(Object.values(assets)));
      void fetchCached('conteudoModulos', getModulos).then((items) => preloadImages(items.map((item) => item.thumbnail)));
      void fetchCached('arcade-games', getArcadeGames).then((items) => preloadImages(items.map((item) => item.image)));
      void fetchCached('achievementTrail', getAchievementTrail).then((trail) => preloadImages(trail.nodes.map((node) => node.icon)));
    }, 250);
    return () => window.clearTimeout(timer);
  }, []);
}
