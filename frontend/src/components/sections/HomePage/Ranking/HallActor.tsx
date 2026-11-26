import { useEffect, useState } from 'react';
import { CharacterAvatar } from '@/components/shared/Character/CharacterAvatar';
import type { CharacterLook } from '@/services/dashboard';

const HAPPY_MS = 1200;

interface HallActorProps {
  /** Aluno em destaque: ao mudar, a reação do cutucar recomeça e o personagem entra de novo, com um pulo. */
  entryId: string;
  look: CharacterLook;
  color: string;
  pokeLabel: string;
  reduceMotion: boolean;
  /** Turma: três personagens padrão (esquerda, centro, direita) no lugar do personagem do aluno. */
  trio?: readonly [string, string, string] | null;
}

interface PokeState { id: string; count: number; happy: boolean }

interface BodyProps { look: CharacterLook; color: string; drop: boolean; hop: string; happy: boolean; trio?: readonly [string, string, string] | null }

/** Um personagem do trio da turma (compacto, com o visual padrão); só o do centro reage ao cutucar. */
function TrioMember({ slot, color, drop, hop, happy }: { slot: 'is-left' | 'is-center' | 'is-right'; color: string; drop: boolean; hop?: string; happy?: boolean }) {
  const face = <CharacterAvatar look={{}} color={color} variant="compact" expression={happy ? 'happy' : 'open'} />;
  return (
    <div className={`hall-actor is-trio ${slot}`}>
      <div className={drop ? 'hall-enter is-drop' : 'hall-enter'}>
        <div className="hall-float">{hop === undefined ? face : <div className={`hall-poke${hop}`}>{face}</div>}</div>
      </div>
    </div>
  );
}

/** O personagem animado (ou o trio da turma); remontado a cada aluno (key) para a queda recomeçar. */
function ActorBody({ look, color, drop, hop, happy, trio }: BodyProps) {
  if (trio) {
    return (
      <>
        <TrioMember slot="is-left" color={trio[0]} drop={drop} />
        <TrioMember slot="is-right" color={trio[2]} drop={drop} />
        <TrioMember slot="is-center" color={trio[1]} drop={drop} hop={hop} happy={happy} />
      </>
    );
  }
  return (
    <div className="hall-actor">
      <div className={drop ? 'hall-enter is-drop' : 'hall-enter'}>
        <div className="hall-float">
          <div className={`hall-poke${hop}`}>
            <CharacterAvatar look={look} color={color} variant="full" expression={happy ? 'happy' : 'open'} />
          </div>
        </div>
      </div>
    </div>
  );
}

/**
 * O personagem no palco, em `variant="full"`, e o "cutucar": uma reação só local
 * (pulinho e olhos felizes), sem chamada ao backend. Com movimento reduzido só a expressão muda.
 * O botão de cutucar fica fora da parte remontada por aluno: o foco sobrevive às setas ← →.
 */
export function HallActor({ entryId, look, color, pokeLabel, reduceMotion, trio }: HallActorProps) {
  const [stored, setStored] = useState<PokeState>({ id: entryId, count: 0, happy: false });
  const poke = stored.id === entryId ? stored : { id: entryId, count: 0, happy: false };

  useEffect(() => {
    if (!stored.happy) return undefined;
    const timer = window.setTimeout(() => setStored((current) => ({ ...current, happy: false })), HAPPY_MS);
    return () => window.clearTimeout(timer);
  }, [stored.count, stored.happy]);

  const hop = !reduceMotion && poke.count > 0 ? ` is-hop-${poke.count % 2 === 0 ? 'b' : 'a'}` : '';
  return (
    <>
      <ActorBody key={entryId} look={look} color={color} drop={!reduceMotion} hop={hop} happy={poke.happy} trio={trio} />
      <button
        type="button"
        className="hall-pokebtn"
        aria-label={pokeLabel}
        onClick={() => setStored({ id: entryId, count: poke.count + 1, happy: true })}
      />
    </>
  );
}
