const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const { cardFrameParts } = load('src/components/shared/Character/cardFrameParts.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));
const near = (actual, expected) => assert.ok(Math.abs(actual - expected) < 1e-6, `${actual} != ${expected}`);

// Moldura em retrato: 478 x 864 px dentro da prancheta 956 x 1080.
const bounds = { x: 0.25, y: 0.1, w: 0.5, h: 0.8 };
const fx = 239, fy = 108, fw = 478, fh = 864;
const H = 108;
const scale = H / fh;
const scaledW = fw * scale;

test('card largo: cinco pedaços, esquerda em 0, direita até W, enfeite do meio centralizado', () => {
  const W = 700;
  const parts = plain(cardFrameParts(bounds, W, H));
  assert.equal(parts.length, 5);
  const [gapA, gapB, left, center, right] = parts;
  near(left.dx, 0);
  near(right.dx + right.dw, W);
  near(center.dx + center.dw / 2, W / 2);
  near(left.sx, fx);
  near(left.sw, 0.36 * fw);
  near(center.sw, 0.28 * fw);
  near(right.sx + right.sw, fx + fw);
  for (const part of [left, center, right]) {
    near(part.dy, 0);
    near(part.dh, H);
    near(part.dw, part.sw * scale);
    near(part.sy, fy);
    near(part.sh, fh);
  }
  // vãos: faixa de 2 px da arte esticada, com 1 px de sobreposição de cada lado
  near(gapA.sx, fx + 0.36 * fw - 2);
  near(gapA.sw, 2);
  near(gapA.dx, left.dw - 1);
  near(gapA.dx + gapA.dw, center.dx + 1);
  near(gapB.sx, fx + 0.64 * fw);
  near(gapB.dx, center.dx + center.dw - 1);
  near(gapB.dx + gapB.dw, right.dx + 1);
});

test('card exatamente da largura escalada: três pedaços, sem vãos', () => {
  const parts = plain(cardFrameParts(bounds, scaledW, H));
  assert.equal(parts.length, 3);
  near(parts[0].dx, 0);
  near(parts[2].dx + parts[2].dw, scaledW);
});

test('card estreito: um pedaço com a moldura inteira, reduzida e centralizada', () => {
  const W = 40;
  const parts = plain(cardFrameParts(bounds, W, H));
  assert.equal(parts.length, 1);
  const [only] = parts;
  const fit = Math.min(scale, W / fw);
  near(only.dw, fw * fit);
  near(only.dh, fh * fit);
  near(only.dx, (W - only.dw) / 2);
  near(only.dy, (H - only.dh) / 2);
  assert.deepEqual([only.sx, only.sy, only.sw, only.sh], [fx, fy, fw, fh]);
});

test('tamanho ou caixa inválidos não geram pedaços', () => {
  assert.deepEqual(plain(cardFrameParts(bounds, 0, H)), []);
  assert.deepEqual(plain(cardFrameParts(bounds, 100, 0)), []);
  assert.deepEqual(plain(cardFrameParts({ x: 0, y: 0, w: 0, h: 0.5 }, 100, H)), []);
});
