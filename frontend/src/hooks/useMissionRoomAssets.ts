import { missionRoomAssets } from '@/lib/staticArtwork';

export type MissionRoomAssets = Record<string, string>;

export function loadMissionRoomAssets() {
  return Promise.resolve(missionRoomAssets);
}

export function useMissionRoomAssets() {
  return missionRoomAssets;
}
