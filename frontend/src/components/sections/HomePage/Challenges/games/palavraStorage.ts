export interface SavedPalavraGame {
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
}

export function palavraStorageKey(userId: number | null, date = new Date()): string | null {
  if (!Number.isSafeInteger(userId) || userId === null || userId <= 0) return null;
  return `termotech:v3:${userId}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function loadPalavraGame(key: string | null, storage: Pick<Storage, 'getItem'>): SavedPalavraGame | null {
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedPalavraGame;
    if (!Array.isArray(saved.guesses) || !['playing', 'won', 'lost'].includes(saved.status)) return null;
    return saved;
  } catch {
    return null;
  }
}

export function savePalavraGame(key: string | null, game: SavedPalavraGame, storage: Pick<Storage, 'setItem'>): void {
  if (!key) return;
  try {
    storage.setItem(key, JSON.stringify(game));
  } catch {
    // O jogo continua utilizável quando o armazenamento local estiver indisponível.
  }
}
