import { useEffect, useState } from 'react';
import { api } from '@/services/api';

export type MissionRoomAssets = Record<string, string>;
let cached: MissionRoomAssets | null = null;
let pending: Promise<MissionRoomAssets> | null = null;

export function useMissionRoomAssets() {
  const [assets, setAssets] = useState<MissionRoomAssets>(cached ?? {});
  useEffect(() => {
    if (cached) return;
    pending ??= api.get<MissionRoomAssets>('/conteudo/ui-assets/missions-room').then(({ data }) => (cached = data));
    pending.then(setAssets).catch(() => setAssets({}));
  }, []);
  return assets;
}
