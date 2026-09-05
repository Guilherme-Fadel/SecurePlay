import { isValidWord } from './termoWords';

const DICTIONARY_URL = '/dictionaries/termotech-valid-words-5.txt';

let dictionary: Set<string> | null = null;
let dictionaryPromise: Promise<Set<string>> | null = null;

export function normalizeTermoWord(word: string): string {
  return word
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

export function preloadTermoDictionary(): Promise<Set<string>> {
  if (dictionary) return Promise.resolve(dictionary);

  dictionaryPromise ??= fetch(DICTIONARY_URL, {
    cache: 'force-cache',
    headers: { Accept: 'text/plain' },
  })
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load TermoTech dictionary: ${response.status}`);
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

export async function isValidTermoGuess(word: string): Promise<boolean> {
  const normalizedWord = normalizeTermoWord(word);

  if (isValidWord(normalizedWord)) return true;

  const validWords = await preloadTermoDictionary();
  return validWords.has(normalizedWord);
}
