import { Achievement } from './entities/achievement.entity';
import { UsuarioAchievement } from './entities/usuario-achievement.entity';
import { PrestigeWallet } from './entities/prestige-wallet.entity';
import {
  AchievementTrailNode,
  AchievementTrailResponse,
} from './achievements.types';

/**
 * Traduz a definicao da conquista + o registro do usuario no no exibido na
 * trilha. Funcao pura: quem chama resolve a arte e a pre-condicao antes.
 */
export function buildTrailNode(params: {
  definition: Achievement;
  record: UsuarioAchievement;
  prerequisiteMet: boolean;
  concealed: boolean;
  artworkUrl: string | null;
}): AchievementTrailNode {
  const { definition, record, prerequisiteMet, concealed, artworkUrl } = params;
  return {
    id: definition.id,
    slug: definition.slug,
    name: concealed ? 'Conquista secreta' : definition.name,
    description: concealed
      ? 'Continue avançando para revelar esta conquista.'
      : definition.description,
    category: definition.category,
    rarity: definition.rarity,
    tier: definition.tier,
    icon: concealed ? 'lock-keyhole' : definition.icon,
    iconName: concealed ? 'lock-keyhole' : definition.icon,
    artworkUrl: concealed ? null : artworkUrl,
    rewardPrestige: concealed ? null : definition.reward_prestige,
    prerequisiteSlug: definition.prerequisite_slug,
    position: { x: definition.position_x, y: definition.position_y },
    progress: concealed ? 0 : record.progress,
    target: concealed ? null : definition.requirement_value,
    progressPercent: concealed
      ? 0
      : Math.min(
          100,
          Math.round((record.progress / definition.requirement_value) * 100),
        ),
    status: record.unlocked
      ? 'unlocked'
      : prerequisiteMet
        ? 'in_progress'
        : 'locked',
    unlockedAt: record.unlocked_at,
    secret: definition.secret,
  };
}

export function buildTrailSummary(params: {
  nodes: AchievementTrailNode[];
  wallet: PrestigeWallet;
  level: number;
}): AchievementTrailResponse['summary'] {
  const { nodes, wallet, level } = params;
  const unlocked = nodes.filter((node) => node.status === 'unlocked').length;
  return {
    unlocked,
    total: nodes.length,
    progressPercent:
      nodes.length === 0 ? 0 : Math.round((unlocked / nodes.length) * 100),
    prestigeBalance: wallet.balance,
    prestigeEarned: wallet.total_earned,
    level,
  };
}
