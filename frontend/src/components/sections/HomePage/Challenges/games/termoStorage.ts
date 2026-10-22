export interface SavedTermoGame {
  guesses: string[];
  status: 'playing' | 'won' | 'lost';
}

export function termoStorageKey(userId: number | null, date = new Date()): string | null {
  if (!Number.isSafeInteger(userId) || userId === null || userId <= 0) return null;
  return `termotech:v3:${userId}:${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function loadTermoGame(key: string | null, storage: Pick<Storage, 'getItem'>): SavedTermoGame | null {
  if (!key) return null;
  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedTermoGame;
    if (!Array.isArray(saved.guesses) || !['playing', 'won', 'lost'].includes(saved.status)) return null;
    return saved;
  } catch {
    return null;
  }
}

export function saveTermoGame(key: string | null, game: SavedTermoGame, storage: Pick<Storage, 'setItem'>): void {
  if (!key) return;
  try {
    storage.setItem(key, JSON.stringify(game));
  } catch {
    // O jogo continua utilizável quando o armazenamento local estiver indisponível.
  }
}
