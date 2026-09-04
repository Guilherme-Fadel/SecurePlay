/*
 * Falha o build quando um asset referenciado pelo codigo nao esta versionado no git.
 *
 * Motivo: o .gitignore ignora *.png globalmente e mantem uma allowlist manual de
 * excecoes. Toda imagem nova precisa ser adicionada a essa lista; quando alguem
 * esquece, o build passa na maquina local (o arquivo existe em disco) e quebra no
 * CI (o arquivo nao existe no clone). Este script antecipa a falha para o local.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const FRONTEND = path.resolve(__dirname, '..');
const REPO = path.resolve(FRONTEND, '..');
const SRC = path.join(FRONTEND, 'src');
const ASSET_EXT = 'png|jpe?g|webp|svg|gif|mp4|mp3|ogg';

let tracked;
try {
  tracked = new Set(
    execSync('git ls-files', { cwd: REPO, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean),
  );
} catch {
  // Sem git disponivel nao ha o que comparar: nao e motivo para impedir o build.
  console.warn('[check-assets] git indisponivel, verificacao ignorada.');
  process.exit(0);
}

const walk = (dir, acc = []) => {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    entry.isDirectory() ? walk(full, acc) : acc.push(full);
  }
  return acc;
};
const relToRepo = (absolute) => path.relative(REPO, absolute).split(path.sep).join('/');

const problems = [];
for (const file of walk(SRC).filter((f) => /\.(tsx?|jsx?|css)$/.test(f))) {
  const text = fs.readFileSync(file, 'utf8');
  const patterns = [
    // import x from '@/assets/...' | './art.png'  -> bundlado, quebra o build
    new RegExp(`from\\s+['"]([^'"]+\\.(?:${ASSET_EXT}))['"]`, 'g'),
    // url(./art.png) dentro de CSS -> tambem resolvido no build
    new RegExp(`url\\(\\s*['"]?((?:\\.|@)/[^'")]+\\.(?:${ASSET_EXT}))['"]?\\s*\\)`, 'g'),
  ];
  for (const pattern of patterns) {
    for (const match of text.matchAll(pattern)) {
      const spec = match[1];
      const absolute = spec.startsWith('@/')
        ? path.join(SRC, spec.slice(2))
        : path.resolve(path.dirname(file), spec);
      if (tracked.has(relToRepo(absolute))) continue;
      problems.push({
        asset: relToRepo(absolute),
        source: relToRepo(file),
        onDisk: fs.existsSync(absolute),
      });
    }
  }
}

if (problems.length === 0) process.exit(0);

console.error(`\n[check-assets] ${problems.length} asset(s) referenciados nao estao versionados:\n`);
for (const { asset, source, onDisk } of new Map(problems.map((p) => [p.asset, p])).values()) {
  console.error(`  ${asset}`);
  console.error(`    usado em: ${source}`);
  console.error(`    em disco: ${onDisk ? 'sim (por isso o build local passa)' : 'nao'}`);
}
console.error('\nCorrija adicionando a excecao no .gitignore e versionando o arquivo, por exemplo:');
console.error(`  git add -f ${problems[0].asset}\n`);
process.exit(1);
