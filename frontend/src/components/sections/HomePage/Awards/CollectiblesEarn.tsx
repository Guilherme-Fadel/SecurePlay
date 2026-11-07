import { forwardRef } from 'react';
import { ChevronsUp } from 'lucide-react';
import { AchievementIcon } from '@/components/ui/visuals/AchievementIcon';
import { DigitalKeyIcon } from '@/components/ui/visuals/DigitalKeyIcon';
import type { AchievementTrail } from '@/services/achievements';
import { keysLabel, nearKeyAchievements } from './collectiblesModel';

export const EARN_SECTION_ID = 'cole-ganhar';

/**
 * "Como ganhar mais chaves" com o que o backend faz hoje: cada conquista
 * desbloqueada credita a recompensa dela e cada nível alcançado credita 1 chave
 * (achievements.service.ts, grantLevelPrestige).
 */
export const CollectiblesEarn = forwardRef<HTMLHeadingElement, { trail: AchievementTrail | null; balance: number }>(
  function CollectiblesEarn({ trail, balance }, headingRef) {
    const near = nearKeyAchievements(trail, 3);
    const more = near.total - near.items.length;

    return (
      <section id={EARN_SECTION_ID} className="cole-earn" aria-labelledby="cole-earn-title">
        <header className="cole-earn-head">
          <h2 id="cole-earn-title" ref={headingRef} tabIndex={-1} className="cole-display">Como ganhar mais chaves</h2>
          {near.items.length > 0 && <small>Conquistas que estão perto</small>}
        </header>
        <div className="cole-earn-body">
          {balance === 0 && <p className="cole-earn-zero">Seu saldo está em zero. As primeiras chaves chegam com a próxima conquista ou o próximo nível.</p>}
          {!trail ? (
            <p className="cole-earn-text">Cada conquista desbloqueada rende Chaves Digitais.</p>
          ) : near.items.length === 0 ? (
            <p className="cole-earn-text">Nenhuma conquista com chaves está em andamento agora. Continue estudando para liberar os próximos marcos.</p>
          ) : (
            <ul className="cole-earn-list">
              {near.items.map(({ node, reward, progressLabel }) => (
                <li key={node.slug}>
                  <span className="cole-earn-art" aria-hidden="true">
                    <AchievementIcon slug={node.slug} icon={node.iconName ?? node.icon} artworkUrl={node.artworkUrl} size={52} />
                  </span>
                  <div className="cole-earn-copy">
                    <strong>{node.name}</strong>
                    <small>{node.description} · {progressLabel}</small>
                    <span className="cole-earn-bar" aria-hidden="true"><span style={{ width: `${Math.max(0, Math.min(100, node.progressPercent))}%` }} /></span>
                  </div>
                  <span className="cole-earn-keys" aria-label={`Rende ${keysLabel(reward)}`}>
                    <DigitalKeyIcon size={20} />+{reward}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {more > 0 && <p className="cole-earn-more">E mais {more} {more === 1 ? 'conquista' : 'conquistas'} em andamento na aba Álbum.</p>}
          <p className="cole-earn-level">
            <ChevronsUp size={18} aria-hidden="true" />
            <span>Cada nível novo também vale +1 chave.{trail ? ` Você está no nível ${trail.summary.level}.` : ''}</span>
          </p>
        </div>
      </section>
    );
  },
);
