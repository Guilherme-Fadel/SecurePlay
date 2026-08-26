export type LetterState = 'correct' | 'present' | 'absent';

// Avalia um palpite contra a resposta, no estilo Termo/Wordle.
// Trata letras repetidas corretamente (2 passadas).
export function evaluateGuess(guess: string, answer: string): LetterState[] {
  const g = guess.toUpperCase();
  const a = answer.toUpperCase();
  const result: LetterState[] = new Array(g.length).fill('absent');
  const counts: Record<string, number> = {};

  for (const ch of a) counts[ch] = (counts[ch] ?? 0) + 1;

  // 1a passada: acertos exatos (verde)
  for (let i = 0; i < g.length; i++) {
    if (g[i] === a[i]) {
      result[i] = 'correct';
      counts[g[i]]--;
    }
  }

  // 2a passada: letra existe em outra posicao (amarelo), respeitando contagem
  for (let i = 0; i < g.length; i++) {
    if (result[i] === 'correct') continue;
    const ch = g[i];
    if (counts[ch] > 0) {
      result[i] = 'present';
      counts[ch]--;
    }
  }

  return result;
}

// Agrega o melhor estado conhecido de cada letra (para colorir o teclado).
export function mergeKeyStates(
  current: Record<string, LetterState>,
  guess: string,
  states: LetterState[],
): Record<string, LetterState> {
  const rank: Record<LetterState, number> = { absent: 0, present: 1, correct: 2 };
  const next = { ...current };
  const g = guess.toUpperCase();
  for (let i = 0; i < g.length; i++) {
    const ch = g[i];
    const s = states[i];
    if (next[ch] == null || rank[s] > rank[next[ch]]) {
      next[ch] = s;
    }
  }
  return next;
}
