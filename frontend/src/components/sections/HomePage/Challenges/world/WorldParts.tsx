import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { BrandCharacter } from '@/components/shared/BrandCharacter';
import { cn } from '@/lib/utils';

/** Peças pequenas e reutilizáveis dos mundos dos jogos. Estilos em styles/game-worlds.css. */

/* ---------- Bandeirinhas de progresso ---------- */

interface WorldFlagsProps {
  /** Quantidade de bandeirinhas. */
  total: number;
  /** Quantas já foram cumpridas. */
  done: number;
  /** Índice da bandeirinha atual (preta). Padrão: a próxima depois das cumpridas. `false` apaga a atual. */
  now?: number | false;
}

/** Bandeirinhas de progresso: cumpridas na cor do jogo, a atual em preto. Decorativas. */
export function WorldFlags({ total, done, now }: WorldFlagsProps) {
  const current = now === undefined ? (done < total ? done : -1) : now === false ? -1 : now;
  return (
    <ol className="gw-flags" aria-hidden="true">
      {Array.from({ length: total }, (_, index) => (
        <li key={index} className={index < done ? 'done' : index === current ? 'now' : undefined} />
      ))}
    </ol>
  );
}

/* ---------- Guia: o personagem amarelo + balão ---------- */

interface WorldGuideProps {
  /** Fala do balão. */
  text: ReactNode;
  /** `row`: personagem ao lado do balão (padrão). `col`: balão acima do personagem. */
  variant?: 'row' | 'col';
  /** Anuncia mudanças do balão para leitor de tela (use quando a fala reage ao jogo). */
  live?: boolean;
  className?: string;
}

/** O personagem amarelo da marca (decorativo) com uma fala. */
export function WorldGuide({ text, variant = 'row', live = false, className }: WorldGuideProps) {
  return (
    <div className={cn('gw-guide', variant === 'col' && 'col', className)}>
      <span className="gw-pet" aria-hidden="true">
        <BrandCharacter body="#FED501" face="#000000" expression="happy" />
      </span>
      <p className="gw-say" aria-live={live ? 'polite' : undefined}>{text}</p>
    </div>
  );
}

/* ---------- Papel, chip, fatos ---------- */

interface WorldBoxProps {
  children: ReactNode;
  className?: string;
}

/** Papel com contorno preto, usado na abertura e no resultado. */
export function WorldPaper({ children, className }: WorldBoxProps) {
  return <div className={cn('gw-paper', className)}>{children}</div>;
}

/** Pílula branca com contorno (contador, status). Mesmo visual do chip do HUD. */
export function WorldChip({ children, className, ...rest }: WorldBoxProps & { role?: string; 'aria-live'?: 'polite' | 'assertive' | 'off' }) {
  return <div className={cn('gw-chip', className)} {...rest}>{children}</div>;
}

/** Selo pequeno de informação (ex.: "100 XP"). Texto simples já vira um destes na abertura. */
export function WorldFact({ children }: { children: ReactNode }) {
  return <span className="gw-fact">{children}</span>;
}

/** Selo da ficha: "Usa 1 ficha" por padrão. */
export function CoinFact({ children = 'Usa 1 ficha' }: { children?: ReactNode }) {
  return <WorldFact><i className="gw-coin" aria-hidden="true" />{children}</WorldFact>;
}

/** Gema de XP (a mesma do deck). `value` já com sinal, ex.: "+100". */
export function WorldGem({ value, unit = 'XP', large = false }: { value: ReactNode; unit?: string; large?: boolean }) {
  return <span className={cn('gw-gem', large && 'lg')}>{value}<small>{unit}</small></span>;
}

/* ---------- Botões ---------- */

export type WorldButtonVariant = 'primary' | 'play' | 'ghost' | 'safe' | 'sus';

interface WorldButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** `play` (amarelo, ação principal), `primary` (azul), `ghost` (branco), `safe`/`sus` (azul/vermelho de decisão). */
  variant?: WorldButtonVariant;
  size?: 'md' | 'sm';
  /** Textinho depois do rótulo, ex.: "· 1 ficha". */
  suffix?: ReactNode;
}

/** Botão da marca, com contorno preto de figurinha. */
export function WorldButton({ variant = 'primary', size = 'md', suffix, className, children, type = 'button', ...rest }: WorldButtonProps) {
  return (
    <button type={type} className={cn('gw-btn', variant !== 'primary' && variant, size === 'sm' && 'sm', className)} {...rest}>
      {children}
      {suffix ? <small>{suffix}</small> : null}
    </button>
  );
}

/* ---------- Confete ---------- */

const CONFETTI = [
  { left: '12%', color: '#FED501', delay: '-0.2s' },
  { left: '22%', color: '#FE96C7', delay: '-1.4s' },
  { left: '31%', color: '#2662E7', delay: '-2.6s' },
  { left: '44%', color: '#FFFFFF', delay: '-0.9s' },
  { left: '57%', color: '#FED501', delay: '-3.1s' },
  { left: '66%', color: '#FF7101', delay: '-1.9s' },
  { left: '78%', color: '#FE96C7', delay: '-0.5s' },
  { left: '88%', color: '#2662E7', delay: '-2.2s' },
] as const;

/** Confete que cai pela cena. Decorativo; some com "reduzir movimento". Vive dentro da camada `deco`. */
export function WorldConfetti() {
  return (
    <>
      {CONFETTI.map((piece) => (
        <span
          key={piece.left}
          className="gw-conf"
          style={{ left: piece.left, backgroundColor: piece.color, animationDelay: piece.delay }}
        />
      ))}
    </>
  );
}
