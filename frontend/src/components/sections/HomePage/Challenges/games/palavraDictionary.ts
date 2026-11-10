import { isValidWord } from './palavraWords';

const DICTIONARY_URL = '/dictionaries/palavra-valid-words-5.txt';

let dictionary: Set<string> | null = null;
let dictionaryPromise: Promise<Set<string>> | null = null;

export function normalizePalavraWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function preloadPalavraDictionary(): Promise<Set<string>> {
  if (dictionary) return Promise.resolve(dictionary);

  dictionaryPromise ??= fetch(DICTIONARY_URL, {
    cache: 'force-cache',
    headers: { Accept: 'text/plain' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load Palavra Secreta dictionary: ${response.status}`);
      }

      return response.text();
    })
    .then((content) => {
      dictionary = new Set(
        content
          .split(/\r?\n/)
          .map((word) => word.trim())
          .filter(Boolean),
      );

      return dictionary;
    });

  return dictionaryPromise;
}

export async function isValidPalavraGuess(word: string): Promise<boolean> {
  const normalizedWord = normalizePalavraWord(word);

  if (isValidWord(normalizedWord)) return true;

  const validWords = await preloadPalavraDictionary();
  return validWords.has(normalizedWord);
}
