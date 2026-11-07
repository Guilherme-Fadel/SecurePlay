import type { TokenState } from '@/services/arcade';

interface TokenCoinsProps {
  tokens: TokenState | null;
  secondsLeft: number;
}

function formatCountdown(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
}

/**
 * Fichas como moedas (saldo/cap) e o tempo até a próxima. O relógio não é
 * região viva: anunciar a cada segundo seria ruído para leitor de tela.
 */
export function TokenCoins({ tokens, secondsLeft }: TokenCoinsProps) {
  if (!tokens) return null;
  const full = tokens.balance >= tokens.cap;
  const coins = Array.from({ length: Math.max(0, tokens.cap) }, (_, i) => i < tokens.balance);
  return (
    <div className="dk-tokens">
      <span className="dk-coins" aria-hidden="true">
        {coins.map((on, i) => <i key={i} className={on ? 'dk-coin-mini' : 'dk-coin-mini is-off'} />)}
      </span>
      <span className="dk-tokens-text">
        <strong>{tokens.balance}/{tokens.cap} fichas</strong>
        <small>{full ? 'Cheio · pronto para jogar' : `+1 ficha em ${formatCountdown(secondsLeft)}`}</small>
      </span>
    </div>
  );
}
