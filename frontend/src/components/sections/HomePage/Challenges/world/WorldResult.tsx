import { useId, type ReactNode } from 'react';
import { WorldButton, WorldGem, WorldGuide, WorldPaper } from './WorldParts';

export interface WorldResultProps {
  /** Título do papel, ex.: "Show encerrado!". */
  title: string;
  /** Linha de cima do papel. Padrão: "Missão concluída". */
  kicker?: string;
  /** Pontuação no disco. Ignorado se `hero` for passado. */
  score?: number;
  /** Legenda sob a pontuação. Padrão: "pontos". */
  scoreLabel?: string;
  /** Substitui o disco de pontos (ex.: o cofre aberto da Palavra Secreta). */
  hero?: ReactNode;
  /** XP ganho: mostra a gema amarela "+N XP" na linha de XP. */
  xp?: number;
  /** Texto da linha de XP (ao lado da gema, ou sozinho se não houver `xp`). */
  xpText?: ReactNode;
  /** Aviso extra sob o XP, ex.: XP reduzido por já ter jogado hoje. */
  note?: ReactNode;
  /** Fala do guia no papel. */
  guide: ReactNode;
  /** Mostra "Jogar de novo" (amarelo) quando informado. */
  onPlayAgain?: () => void;
  /** Textinho do "Jogar de novo", ex.: "· 1 ficha". */
  playAgainSuffix?: ReactNode;
  playAgainDisabled?: boolean;
  onExit: () => void;
  /** Rótulo de sair. Padrão: "Voltar aos jogos". */
  exitLabel?: string;
  /** Substitui por completo os botões padrão (jogar de novo / voltar). */
  actions?: ReactNode;
  /** Conteúdo do papel depois do guia: normalmente a `WorldReviewList`. */
  children?: ReactNode;
}

function ResultXp({ xp, text }: { xp?: number; text?: ReactNode }) {
  if (xp === undefined && text === undefined) return null;
  return (
    <div className="gw-xp">
      {xp !== undefined && <WorldGem value={`+${xp}`} />}
      {text !== undefined && <span>{text}</span>}
    </div>
  );
}

type ResultActionsProps = Pick<WorldResultProps, 'onPlayAgain' | 'playAgainSuffix' | 'playAgainDisabled' | 'onExit' | 'exitLabel'>;

function ResultActions({ onPlayAgain, playAgainSuffix, playAgainDisabled, onExit, exitLabel }: ResultActionsProps) {
  return (
    <>
      {onPlayAgain && <WorldButton variant="play" onClick={onPlayAgain} disabled={playAgainDisabled} suffix={playAgainSuffix}>Jogar de novo</WorldButton>}
      <WorldButton variant={onPlayAgain ? 'ghost' : 'play'} onClick={onExit}>{exitLabel}</WorldButton>
    </>
  );
}

/** Resultado: à esquerda o disco de pontos, XP e botões; à direita o papel com a revisão. Vai dentro do `GameWorld`. */
export function WorldResult({
  title,
  kicker = 'Missão concluída',
  score,
  scoreLabel = 'pontos',
  hero,
  xp,
  xpText,
  note,
  guide,
  onPlayAgain,
  playAgainSuffix,
  playAgainDisabled = false,
  onExit,
  exitLabel = 'Voltar aos jogos',
  actions,
  children,
}: WorldResultProps) {
  const titleId = useId();
  return (
    <section className="gw-res" aria-labelledby={titleId}>
      <div className="gw-medal">
        {hero ?? (
          <div className="gw-disc">
            <div><b>{score ?? 0}</b><small>{scoreLabel}</small></div>
          </div>
        )}
        <ResultXp xp={xp} text={xpText} />
        {note ? <p className="gw-note">{note}</p> : null}
        <div className="gw-cta">
          {actions ?? <ResultActions onPlayAgain={onPlayAgain} playAgainSuffix={playAgainSuffix} playAgainDisabled={playAgainDisabled} onExit={onExit} exitLabel={exitLabel} />}
        </div>
      </div>

      <WorldPaper>
        <p className="gw-k">{kicker}</p>
        <h2 id={titleId} className="gw-disp">{title}</h2>
        <WorldGuide text={guide} />
        {children}
      </WorldPaper>
    </section>
  );
}
