import { useMyCharacter } from '@/hooks/useMyCharacter';
import { cn } from '@/lib/utils';
import { CharacterAvatar } from './CharacterAvatar';
import './user-character.css';

interface UserCharacterProps {
  className?: string;
  /** `compact` (busto, padrão) ou `full` (corpo inteiro, com o efeito equipado). */
  variant?: 'compact' | 'full';
}

/**
 * Personagem montável do usuário logado, solto (sem círculo, placa ou fundo). Decorativo: o nome fica ao lado.
 * `className` traz só a largura; a altura segue a proporção do personagem.
 */
export function UserCharacter({ className, variant = 'compact' }: UserCharacterProps) {
  const { look, color } = useMyCharacter();
  return (
    <span className={cn('user-character', className)} aria-hidden="true">
      <CharacterAvatar look={look} color={color} variant={variant} />
    </span>
  );
}
