const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, '../src/components/sections/HomePage/Challenges/games/termoStorage.ts'), 'utf8');
const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
const loadedModule = { exports: {} };
vm.runInNewContext(compiled.outputText, { module: loadedModule, exports: loadedModule.exports, Date, JSON, Number, Array });
const { loadTermoGame, saveTermoGame, termoStorageKey } = loadedModule.exports;
const date = new Date(2026, 9, 22);
const firstKey = termoStorageKey(11, date);
const secondKey = termoStorageKey(12, date);
assert.equal(firstKey, 'termotech:v3:11:2026-10-22');
assert.notEqual(firstKey, secondKey);
assert.equal(termoStorageKey(null, date), null);
assert.equal(termoStorageKey(0, date), null);

const values = new Map([['termotech:v2:2026-10-22', JSON.stringify({ guesses: ['TESTE'], status: 'playing' })]]);
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
};
assert.equal(loadTermoGame(firstKey, storage), null, 'old shared progress is not assigned to an account');
saveTermoGame(firstKey, { guesses: ['CASAS'], status: 'playing' }, storage);
assert.deepEqual(loadTermoGame(firstKey, storage), { guesses: ['CASAS'], status: 'playing' });
assert.equal(loadTermoGame(secondKey, storage), null, 'one account cannot read another account progress');
assert.equal(values.has('termotech:v2:2026-10-22'), true, 'legacy progress remains intact');
saveTermoGame(null, { guesses: [], status: 'playing' }, storage);
assert.equal(values.size, 2, 'anonymous state is never persisted');
console.log('8 verificações de isolamento e preservação do TermoTech aprovadas.');
