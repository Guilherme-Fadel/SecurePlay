const fs = require('node:fs');
const path = require('node:path');

const ENGLISH_WORDS = require('an-array-of-english-words');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(
  ROOT_DIR,
  'public',
  'dictionaries',
  'termotech-valid-words-5.txt',
);

const BLOCKED_WORDS = new Set([
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

const EXTRA_ALLOWED_WORDS = [
  'cyber',
  'prime',
  'pride',
];

function normalizeWord(input) {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase();
}

function addWord(words, rawWord) {
  const baseWord = String(rawWord).split('/')[0].trim();

  if (!/^\p{L}+$/u.test(baseWord)) return;

  const normalized = normalizeWord(baseWord);
  const blockedKey = normalized.toLowerCase();

  if (!/^[A-Z]{5}$/.test(normalized)) return;
  if (BLOCKED_WORDS.has(blockedKey)) return;

  words.add(normalized);
}

async function readPortugueseWords() {
  const dictionaryPt = await import('dictionary-pt');
  const dictionary = dictionaryPt.default;

  return dictionary.dic.toString('utf8').split(/\r?\n/).slice(1);
}

async function main() {
  const words = new Set();
  const portugueseWords = await readPortugueseWords();

  for (const word of ENGLISH_WORDS) addWord(words, word);
  for (const word of portugueseWords) addWord(words, word);
  for (const word of EXTRA_ALLOWED_WORDS) addWord(words, word);

  const sortedWords = [...words].sort((a, b) => a.localeCompare(b, 'en-US'));

  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${sortedWords.join('\n')}\n`);

  console.log(
    `TermoTech dictionary generated with ${sortedWords.length} five-letter words.`,
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
