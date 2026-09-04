import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export type MissionRoomAssets = Record<string, string>;
let cached: MissionRoomAssets | null = null;
let cachedAt = 0;
let pending: Promise<MissionRoomAssets> | null = null;
const ASSET_TTL = 45 * 60 * 1000;

export function loadMissionRoomAssets() {
  if (cached && Date.now() - cachedAt < ASSET_TTL) return Promise.resolve(cached);
  pending ??= api.get<MissionRoomAssets>('/conteudo/ui-assets/missions-room').then(({ data }) => {
    cached = data;
    cachedAt = Date.now();
    pending = null;
    return data;
  }).catch((error) => { pending = null; throw error; });
  return pending;
}

export function useMissionRoomAssets() {
  const [assets, setAssets] = useState<MissionRoomAssets>(cached ?? {});
  useEffect(() => {
    loadMissionRoomAssets().then(setAssets).catch(() => setAssets({}));
  }, []);
  return assets;
}
