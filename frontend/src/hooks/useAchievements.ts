import { useState } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { invalidate, setCache } from '@/lib/queryCache';
import { useCurrentUser } from './useCurrentUser';
import { useCompanyFeatures } from './useCompanyFeatures';
import { companyCacheKey } from '@/config/features';
import {
  equipCosmetic,
  getAchievementShop,
  getAchievementTrail,
  getRecentAchievements,
  purchaseCosmetic,
  purchaseCosmeticKit,
  unequipCosmetic,
  type AchievementShop,
  type CosmeticType,
} from '@/services/achievements';

const TRAIL_KEY = 'achievementTrail';
const SHOP_KEY = 'achievementShop';

export function useAchievementTrail(enabled = true) {
  const features = useCompanyFeatures();
  return useCachedQuery(TRAIL_KEY, getAchievementTrail, { staleTime: 45 * 60 * 1000, refetchInterval: 120_000, enabled: enabled && features.achievements });
}

export function useRecentAchievements(enabled = true) {
  const features = useCompanyFeatures();
  return useCachedQuery('achievementRecent', getRecentAchievements, { staleTime: 45 * 60 * 1000, refetchInterval: 120_000, enabled: enabled && features.achievements });
}

export function useAchievementShop(enabled = true) {
  const { user } = useCurrentUser();
  const features = useCompanyFeatures();
  const shopCacheKey = companyCacheKey(SHOP_KEY, user);
  const query = useCachedQuery(SHOP_KEY, getAchievementShop, { staleTime: 15_000, refetchInterval: 120_000, enabled: enabled && features.achievements });
  const [changingItem, setChangingItem] = useState<number | null>(null);
  const [changingKit, setChangingKit] = useState<number | null>(null);

  const purchase = async (itemId: number) => {
    setChangingItem(itemId);
    try {
      const updated = await purchaseCosmetic(itemId);
      setCache<AchievementShop>(shopCacheKey, updated);
      invalidate(TRAIL_KEY);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  const purchaseKit = async (kitId: number) => {
    setChangingKit(kitId);
    try {
      const updated = await purchaseCosmeticKit(kitId);
      setCache<AchievementShop>(shopCacheKey, updated);
      invalidate(TRAIL_KEY);
      return updated;
    } finally {
      setChangingKit(null);
    }
  };

  const equip = async (itemId: number, color?: string) => {
    setChangingItem(itemId);
    try {
      const updated = await equipCosmetic(itemId, color);
      setCache<AchievementShop>(shopCacheKey, updated);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  const unequip = async (type: CosmeticType, itemId: number) => {
    setChangingItem(itemId);
    try {
      const updated = await unequipCosmetic(type);
      setCache<AchievementShop>(shopCacheKey, updated);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  return { ...query, changingItem, changingKit, purchase, purchaseKit, equip, unequip };
}
