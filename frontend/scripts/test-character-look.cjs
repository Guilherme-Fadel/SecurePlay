const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

const look = load('src/components/shared/Character/characterLook.ts', {});
const plain = (value) => JSON.parse(JSON.stringify(value));

const piece = (visualValue, extra = {}) => ({
  visualValue, artUrl: null, color: null, adjust: { x: 0, y: 0, scale: 1 }, layer: 'front', ...extra,
});
const slots = (layers) => layers.map((layer) => layer.slot);

test('camadas na ordem: efeito atrás, skin, rosto, pescoço, cabeça', () => {
  const layers = look.characterLayers({
    skin: piece('rena'), head: piece('coroa'), face: piece('nariz'), neck: piece('gravata'),
    effect: piece('aura', { layer: 'back' }),
  }, 'full');
  assert.deepEqual(plain(slots(layers)), ['effect', 'skin', 'face', 'neck', 'head']);
  assert.deepEqual(plain(layers.map((layer) => layer.position)), ['back', 'body', 'body', 'body', 'body']);
});

test('efeito na frente vem por último', () => {
  const layers = look.characterLayers({
    skin: piece('lisa'), head: piece('bone'), effect: piece('neve', { layer: 'front' }),
  }, 'full');
  assert.deepEqual(plain(slots(layers)), ['skin', 'head', 'effect']);
  assert.equal(layers[layers.length - 1].position, 'front');
  assert.equal(layers[layers.length - 1].piece.visualValue, 'neve');
});

test('compact não traz efeito', () => {
  const layers = look.characterLayers({ head: piece('bone'), effect: piece('neve') }, 'compact');
  assert.deepEqual(plain(slots(layers)), ['head']);
});

test('fundo e card nunca entram nas camadas do personagem', () => {
  const layers = look.characterLayers({ background: piece('noite'), card: piece('ouro'), face: piece('oculos') }, 'full');
  assert.deepEqual(plain(slots(layers)), ['face']);
});

test('encaixe sem peça não aparece e look vazio não tem camadas', () => {
  assert.deepEqual(plain(look.characterLayers({}, 'full')), []);
  assert.deepEqual(plain(slots(look.characterLayers({ neck: piece('lenco') }, 'full'))), ['neck']);
});

test('ajuste da cabeça: deslocamento e escala em torno da âncora do encaixe', () => {
  const transform = look.pieceTransform('head', { x: 2, y: -3, scale: 1.2 });
  assert.match(transform, /translate\(2 -3\)/);
  assert.match(transform, /translate\(79\.5 4\) scale\(1\.2\) translate\(-79\.5 -4\)/);
});

test('ajuste padrão devolve texto vazio; só deslocamento ou só escala omitem a outra parte', () => {
  assert.equal(look.pieceTransform('head', { x: 0, y: 0, scale: 1 }), '');
  assert.equal(look.pieceTransform('effect', undefined), '');
  assert.equal(look.pieceTransform('face', { x: 4, y: 0, scale: 1 }), 'translate(4 0)');
  assert.equal(look.pieceTransform('neck', { x: 0, y: 0, scale: 2 }), 'translate(79.5 112) scale(2) translate(-79.5 -112)');
});

test('valores inválidos do ajuste caem no padrão', () => {
  assert.equal(look.pieceTransform('head', { x: Number.NaN, y: Infinity, scale: 0 }), '');
});

test('âncoras e prancheta seguem o modelo aprovado', () => {
  assert.deepEqual(plain(look.SLOT_ANCHOR), { skin: [79.5, 35], head: [79.5, 4], face: [79.2, 88], neck: [79.5, 112], effect: [79.5, 35] });
  assert.deepEqual(plain(look.ARTBOARD), { x: -40, y: -100, width: 239, height: 270 });
  assert.deepEqual(plain(look.CHARACTER_VIEWBOX), { full: '-40 -100 239 270', compact: '-14 -56 187 216' });
});

test('mistura de cor: hexadecimal vira hexadecimal; token de cor usa color-mix', () => {
  assert.equal(look.mixColor('#FFFFFF', 0.5, '#000000'), '#808080');
  assert.equal(look.mixColor('#FE96C7', 0, '#000000'), '#fe96c7');
  assert.equal(look.mixColor('var(--sp-blue)', 0.22, '#000000'), 'color-mix(in srgb, var(--sp-blue) 78%, #000000)');
});

test('só aceita endereço de arte http(s) ou da própria origem', () => {
  assert.equal(look.isSafeArtUrl('https://cdn.exemplo.com/arte.png'), true);
  assert.equal(look.isSafeArtUrl('/api/arte.png'), true);
  assert.equal(look.isSafeArtUrl('javascript:alert(1)'), false);
  assert.equal(look.isSafeArtUrl('//evil.com/a.png'), false);
  assert.equal(look.isSafeArtUrl(null), false);
});
