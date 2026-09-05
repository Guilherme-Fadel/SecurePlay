const fs = require('node:fs');
const path = require('node:path');

const DICTIONARY_PATH = path.join(
  __dirname,
  '..',
  'public',
  'dictionaries',
  'termotech-valid-words-5.txt',
);

const REQUIRED_WORDS = ['CYBER', 'PRIME', 'PRIDE'];
const REJECTED_WORDS = ['ZZZZZ', 'PORRA'];

function fail(message) {
  console.error(message);
  process.exitCode = 1;
}

const content = fs.readFileSync(DICTIONARY_PATH, 'utf8').trim();
const words = content ? content.split(/\r?\n/) : [];
const dictionary = new Set(words);

for (const word of words) {
  if (!/^[A-Z]{5}$/.test(word)) fail(`Invalid dictionary word: ${word}`);
}

if (dictionary.size !== words.length) {
  fail('Dictionary contains duplicated words.');
}

for (const word of REQUIRED_WORDS) {
  if (!dictionary.has(word)) fail(`Required word is missing: ${word}`);
}

for (const word of REJECTED_WORDS) {
  if (dictionary.has(word)) fail(`Rejected word is present: ${word}`);
}

if (process.exitCode !== 1) {
  console.log(`TermoTech dictionary verified with ${words.length} words.`);
}
