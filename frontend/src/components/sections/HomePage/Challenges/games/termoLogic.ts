export type LetterState = 'correct' | 'present' | 'absent';
export function evaluateGuess(guess: string, answer: string): LetterState[] {
    const g = guess.toUpperCase();
    const a = answer.toUpperCase();
    const result: LetterState[] = new Array(g.length).fill('absent');
    const counts: Record<string, number> = {};
    for (const ch of a)
        counts[ch] = (counts[ch] ?? 0) + 1;
    for (let i = 0; i < g.length; i++) {
        if (g[i] === a[i]) {
            result[i] = 'correct';
            counts[g[i]]--;
        }
    }
    for (let i = 0; i < g.length; i++) {
        if (result[i] === 'correct')
            continue;
        const ch = g[i];
        if (counts[ch] > 0) {
            result[i] = 'present';
            counts[ch]--;
        }
    }
    return result;
}
export function mergeKeyStates(current: Record<string, LetterState>, guess: string, states: LetterState[]): Record<string, LetterState> {
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
