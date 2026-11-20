import { toItemView } from './collectible-views';
import { CosmeticItem } from './entities/cosmetic-item.entity';

describe('toItemView', () => {
  it('expõe a conquista legada exigida para o console mostrá-la em leitura', async () => {
    const item = {
      id: 1,
      slug: 'moldura',
      required_achievement_slug: 'veterano',
      art_key: null,
      adjust_x: 0,
      adjust_y: 0,
      adjust_scale: 1,
      available_from: null,
      available_until: null,
    } as unknown as CosmeticItem;
    const view = await toItemView(item, () => Promise.resolve(null));
    expect(view.requiredAchievementSlug).toBe('veterano');
  });
});
