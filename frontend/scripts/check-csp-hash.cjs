#!/usr/bin/env node
// Garante que o hash do script inline do index.html na CSP do public/_headers está atualizado.
// Sem isso, mudar o script inline faria a CSP (quando imposta) bloquear o tema claro.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(__dirname, '..');
// A Pages compila a partir do Git (LF); normaliza para não depender do checkout local.
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8').replace(/\r\n/g, '\n');
const headers = fs.readFileSync(path.join(root, 'public', '_headers'), 'utf8');

const inline = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((match) => match[1]);
const missing = inline
  .map((source) => `'sha256-${crypto.createHash('sha256').update(source).digest('base64')}'`)
  .filter((hash) => !headers.includes(hash));

if (missing.length === 0) process.exit(0);
console.error('\n[check-csp-hash] script inline do index.html sem hash na CSP de public/_headers:');
for (const hash of missing) console.error(`  ${hash}`);
console.error('Atualize o script-src da Content-Security-Policy(-Report-Only) com o hash acima.\n');
process.exit(1);
