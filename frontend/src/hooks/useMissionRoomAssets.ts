import { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { preloadImages } from '@/lib/imageCache';

export type MissionRoomAssets = Record<string, string>;
let cached: MissionRoomAssets | null = null;
let pending: Promise<MissionRoomAssets> | null = null;

export function loadMissionRoomAssets() {
  if (cached) return Promise.resolve(cached);
  pending ??= api.get<MissionRoomAssets>('/conteudo/ui-assets/missions-room').then(({ data }) => {
    cached = data;
    preloadImages(Object.values(data));
    return data;
  }).catch((error) => { pending = null; throw error; });
  return pending;
}

export function useMissionRoomAssets() {
  const [assets, setAssets] = useState<MissionRoomAssets>(cached ?? {});
  useEffect(() => {
    if (cached) return;
    loadMissionRoomAssets().then(setAssets).catch(() => setAssets({}));
  }, []);
  return assets;
}
