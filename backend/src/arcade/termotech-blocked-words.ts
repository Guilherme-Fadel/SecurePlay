// Termos de cinco letras impróprios para um jogo voltado a crianças.
// A lista fica no servidor para não ser exposta no bundle do navegador.
const BLOCKED_WORDS = new Set([
  // Português (sem acentos, como o teclado do jogo).
  'bosta',
  'cuzao',
  'foder',
  'orgia',
  'penis',
  'porno',
  'porra',
  'putas',
  'viado',
  'vulva',
  // Inglês.
  'bitch',
  'chink',
  'cocks',
  'dicks',
  'fucks',
  'nigga',
  'pussy',
  'spics',
  'sluts',
  'whore',
]);

export function isBlockedTermoWord(word: string): boolean {
  return BLOCKED_WORDS.has(
    word
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase(),
  );
}
