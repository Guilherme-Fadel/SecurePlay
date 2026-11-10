export type GameStatus = 'AVAILABLE' | 'SOON';
export interface GameCardData {
    id: string;
    title: string;
    description: string;
    image: string;
    xp: number;
    status: GameStatus;
    tag: string;
    gameType?: string;
    roundSize?: number;
}

/** Textos das cartas por slug; o que não estiver aqui usa o texto do catálogo. */
export const CHILD_GAME_COPY: Record<string, { title: string; description: string; tag: string }> = {
  'quiz-relampago': {
    title: 'Quiz Relâmpago',
    description: 'Responda perguntas rápidas antes que o tempo acabe.',
    tag: 'Desafio',
  },
  'caca-phishing': {
    title: 'Detetives de Mensagens',
    description: 'Encontre pistas e descubra se um recado é confiável.',
    tag: 'Investigação',
  },
  'classificacao-dados': {
    title: 'Escudos dos Segredos',
    description: 'Escolha o escudo certo para proteger cada informação.',
    tag: 'Proteção',
  },
  termotech: {
    title: 'Palavra Secreta',
    description: 'Use as pistas para descobrir a palavra de cinco letras.',
    tag: 'Palavras',
  },
};

/**
 * Mesma regra do backend (`arcade.service.ts`): jogos `client_only` não consomem
 * ficha. Sem `gameType` (dado antigo), a Palavra Secreta segue sem ficha.
 */
export function spendsToken(game: Pick<GameCardData, 'id' | 'gameType'>): boolean {
  if (game.gameType) return game.gameType !== 'client_only';
  return game.id !== 'termotech';
}
