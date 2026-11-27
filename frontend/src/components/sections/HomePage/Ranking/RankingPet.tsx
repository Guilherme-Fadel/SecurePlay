import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import { bodyColorOrFallback } from '@/components/shared/Character/characterColor';
import type { CharacterLook } from '@/services/dashboard';
import { avatarTone } from './rankingAvatarTone';

interface RankingPetProps {
  rankKey: string;
  look?: CharacterLook;
  /** O próprio aluno participante: a cor de reserva é o amarelo do trilho. */
  me?: boolean;
  className: string;
}

/** Mini personagem do aluno (visual equipado) no Ranking; sem cor escolhida, a cor fixa pela chave. */
export function RankingPet({ rankKey, look, me = false, className }: RankingPetProps) {
  const tone = avatarTone(rankKey, me);
  return (
    <span className={className} aria-hidden="true">
      <CharacterAvatar look={look ?? {}} color={bodyColorOrFallback(look, tone.background)} variant="compact" />
    </span>
  );
}
