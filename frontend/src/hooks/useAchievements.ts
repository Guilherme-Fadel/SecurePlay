import { useState } from 'react';
import { useCachedQuery } from './useCachedQuery';
import { invalidate, setCache } from '@/lib/queryCache';
import {
  equipCosmetic,
  getAchievementShop,
  getAchievementTrail,
  purchaseCosmetic,
  unequipCosmetic,
  type AchievementShop,
  type CosmeticType,
} from '@/services/achievements';

const TRAIL_KEY = 'achievementTrail';
const SHOP_KEY = 'achievementShop';

export function useAchievementTrail() {
  return useCachedQuery(TRAIL_KEY, getAchievementTrail, { staleTime: 50 * 60 * 1000 });
}

export function useAchievementShop() {
  const query = useCachedQuery(SHOP_KEY, getAchievementShop, { staleTime: 15_000 });
  const [changingItem, setChangingItem] = useState<number | null>(null);

  const purchase = async (itemId: number) => {
    setChangingItem(itemId);
    try {
      const updated = await purchaseCosmetic(itemId);
      setCache<AchievementShop>(SHOP_KEY, updated);
      invalidate(TRAIL_KEY);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  const equip = async (itemId: number) => {
    setChangingItem(itemId);
    try {
      const updated = await equipCosmetic(itemId);
      setCache<AchievementShop>(SHOP_KEY, updated);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  const unequip = async (type: CosmeticType, itemId: number) => {
    setChangingItem(itemId);
    try {
      const updated = await unequipCosmetic(type);
      setCache<AchievementShop>(SHOP_KEY, updated);
      return updated;
    } finally {
      setChangingItem(null);
    }
  };

  return { ...query, changingItem, purchase, equip, unequip };
}
