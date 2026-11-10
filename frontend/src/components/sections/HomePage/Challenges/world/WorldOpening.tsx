import { Fragment, useId, type ReactNode } from 'react';
import { WorldButton, WorldFact, WorldGuide, WorldPaper } from './WorldParts';

export interface WorldOpeningProps {
  /** Nome do jogo no sistema; vai na placa grande (h1). */
  title: string;
  /** Imagem do jogo (pixel art). */
  artwork: string;
  /** Linha de cima do papel, ex.: "Nº 01/04 · Desafio rápido". */
  kicker: string;
  /** Passos numerados de "Como jogar". */
  steps: string[];
  /** Selos de informação. Texto simples vira selo; use `<CoinFact />` para "Usa 1 ficha". */
  facts?: ReactNode[];
  /** Fala do guia. */
  guide: ReactNode;
  /** Rótulo do botão principal, ex.: "Subir no palco". */
  startLabel: string;
  /** Textinho depois do rótulo, ex.: "· 1 ficha". */
  startSuffix?: ReactNode;
  onStart: () => void;
  /** Enquanto verdadeiro, desabilita o botão e mostra `busyLabel`. */
  busy?: boolean;
  busyLabel?: string;
  /** Desabilita o botão principal sem mostrar carregando (ex.: sem fichas). */
  disabled?: boolean;
  /** Rótulo do botão secundário. Padrão: "Voltar aos jogos". */
  exitLabel?: string;
  onExit: () => void;
  /** Conteúdo extra no papel, entre os selos e a fala do guia (ex.: aviso de falta de fichas). */
  children?: ReactNode;
}

/** Abertura do jogo: placa grande balançando e papel com as regras. Vai dentro do `GameWorld`. */
export function WorldOpening({
  title,
  artwork,
  kicker,
  steps,
  facts = [],
  guide,
  startLabel,
  startSuffix,
  onStart,
  busy = false,
  busyLabel = 'Preparando…',
  disabled = false,
  exitLabel = 'Voltar aos jogos',
  onExit,
  children,
}: WorldOpeningProps) {
  const titleId = useId();
  return (
    <section className="gw-open" aria-labelledby={titleId}>
      <div className="gw-gate">
        <div className="gw-big">
          <h1 id={titleId} className="gw-disp">{title}</h1>
        </div>
        <img className="gw-px gw-art" src={artwork} alt="" width={170} height={170} />
      </div>

      <WorldPaper>
        <p className="gw-k">{kicker}</p>
        <h2 className="gw-disp h">Como jogar</h2>
        <ol className="gw-steps">
          {steps.map((step, index) => (
            <li key={index}><b aria-hidden="true">{index + 1}</b><span>{step}</span></li>
          ))}
        </ol>
        {facts.length > 0 && (
          <div className="gw-facts">
            {facts.map((fact, index) => (
              typeof fact === 'string' ? <WorldFact key={index}>{fact}</WorldFact> : <Fragment key={index}>{fact}</Fragment>
            ))}
          </div>
        )}
        {children}
        <WorldGuide text={guide} />
        <div className="gw-cta">
          <WorldButton variant="play" onClick={onStart} disabled={busy || disabled} aria-busy={busy || undefined} suffix={busy ? undefined : startSuffix}>
            {busy ? busyLabel : startLabel}
          </WorldButton>
          <WorldButton variant="ghost" onClick={onExit}>{exitLabel}</WorldButton>
        </div>
      </WorldPaper>
    </section>
  );
}
