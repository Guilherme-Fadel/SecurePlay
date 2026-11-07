import { useState } from 'react';
import { initials } from '@/components/ui/visuals/Avatar';
import type { RankingEntry } from '@/services/dashboard';
import { avatarTone } from './rankingAvatarTone';

interface RankingAvatarProps {
  entry: Pick<RankingEntry, 'id' | 'name' | 'profileImageUrl'>;
  me?: boolean;
  /** Listas longas (classificação, corrida): a foto só carrega perto da área visível. */
  lazy?: boolean;
  className?: string;
}

/**
 * Foto de perfil do participante; sem foto (ou se ela falhar), as iniciais do
 * nome (mesma regra de `Avatar`) sobre uma cor fixa derivada do id. Decorativo:
 * o nome está sempre ao lado. Não usa `<Avatar>` direto porque ele não aceita
 * `loading`, e a classificação pode ter 50 fotos.
 */
export function RankingAvatar({ entry, me = false, lazy = false, className = '' }: RankingAvatarProps) {
  const [failed, setFailed] = useState<string | null>(null);
  const image = entry.profileImageUrl && failed !== entry.profileImageUrl ? entry.profileImageUrl : null;
  const tone = avatarTone(entry.id, me);
  return (
    <span
      className={`rk-avatar${image ? ' has-photo' : ''}${me ? ' is-me' : ''} ${className}`.trim()}
      style={image ? undefined : { background: tone.background, color: tone.color }}
      aria-hidden="true"
    >
      {image
        ? <img src={image} alt="" loading={lazy ? 'lazy' : undefined} decoding="async" draggable={false} onError={() => setFailed(image)} />
        : initials(entry.name)}
    </span>
  );
}
