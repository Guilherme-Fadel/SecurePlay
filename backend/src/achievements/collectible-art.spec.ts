import {
  isTmpArtKey,
  validateArt,
  MAX_ART_BYTES,
  finalArtKey,
} from './collectible-art';

function png(width: number, height: number, extra = 0) {
  const buffer = Buffer.alloc(33 + extra);
  Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer);
  buffer.writeUInt32BE(13, 8);
  buffer.write('IHDR', 12, 'ascii');
  buffer.writeUInt32BE(width, 16);
  buffer.writeUInt32BE(height, 20);
  return buffer;
}

const BOARD = { ok: true, format: 'board' };
const BANNER = { ok: true, format: 'banner' };

const svg = (body = '', attrs = 'viewBox="0 0 956 1080"') =>
  Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" ${attrs}>${body}</svg>`);

describe('validateArt — SVG', () => {
  it('aceita SVG limpo com viewBox 956x1080', () => {
    expect(
      validateArt(svg('<rect width="10" height="10"/>'), 'image/svg+xml'),
    ).toEqual(BOARD);
  });

  it('aceita width/height dobrados e referência local', () => {
    const body = '<use href="#a"/><use xlink:href="#b"/>';
    expect(
      validateArt(
        svg(body, 'viewBox="0 0 956 1080" width="1912" height="2160"'),
        'image/svg+xml',
      ),
    ).toEqual(BOARD);
  });

  it.each([
    ['<script>alert(1)</script>'],
    ['<SCRIPT src="x"></SCRIPT>'],
    ['<rect onload="x()"/>'],
    ['<rect OnClick = "x()"/>'],
    ['<foreignObject><div/></foreignObject>'],
    ['<image href="http://evil.example/a.png"/>'],
    ['<image href="https://evil.example/a.png"/>'],
    ['<image xlink:href="data:image/png;base64,AAAA"/>'],
    ['<use HREF="//evil.example/a.svg#x"/>'],
    ['<x:script xmlns:x="http://www.w3.org/2000/svg">a()</x:script>'],
    ['<svg:foreignObject><div/></svg:foreignObject>'],
    [
      '<a href="#x"><animate attributeName="href" to="javascript:alert(1)"/></a>',
    ],
    ['<set attributeName="href" to="#x"/>'],
    ['<animateMotion path="M0 0"/>'],
    ['<animateTransform attributeName="transform"/>'],
    ['<a href="JavaScript:alert(1)"/>'],
    ['<desc>data:text/html,x</desc>'],
    [String.raw`<style>.a{fill:\75rl(http://evil.example/x)}</style>`],
    [String.raw`<style>@\69mport "http://evil.example/x.css";</style>`],
    [String.raw`<rect style="fill:\75rl(http://evil.example/x)"/>`],
    ['<rect style="fill:url(http://evil.example/x)"/>'],
    ['<style>@import url(x.css);</style>'],
  ])('recusa conteúdo ativo ou externo: %s', (body) => {
    const result = validateArt(svg(body), 'image/svg+xml');
    expect(result.ok).toBe(false);
  });

  it.each([
    ['<html:iframe xmlns:html="http://www.w3.org/1999/xhtml" srcdoc="x"/>'],
    [
      '<html:meta xmlns:html="http://www.w3.org/1999/xhtml" http-equiv="refresh"/>',
    ],
    ['<iframe/>'],
    ['<embed/>'],
    ['<object/>'],
    ['<meta http-equiv="refresh" content="0"/>'],
    ['<rect src="x"/>'],
    ['<rect srcdoc="x"/>'],
    ['<rect xmlns:h="http://www.w3.org/1999/xhtml"/>'],
    ['<g xmlns="http://www.w3.org/1999/xhtml"/>'],
    ['<!-- ok --><html:body/>'],
  ])('recusa elemento/namespace/atributo fora da lista: %s', (body) => {
    const result = validateArt(svg(body), 'image/svg+xml');
    expect(result.ok).toBe(false);
  });

  const INKSCAPE =
    'xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape"';
  const SODIPODI =
    'xmlns:sodipodi="http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd"';

  it('aceita a estrutura do modelo oficial (camadas Inkscape, guia oculta)', () => {
    const body =
      '<g inkscape:groupmode="layer" inkscape:label="GUIA" style="display:none"><rect width="10" height="10"/></g><g inkscape:groupmode="layer" inkscape:label="ARTE" id="arte"><path d="M0 0"/></g>';
    const buffer = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" ${INKSCAPE} viewBox="0 0 956 1080">${body}</svg>`,
    );
    expect(validateArt(buffer, 'image/svg+xml')).toEqual(BOARD);
  });

  it('aceita exportação Inkscape SVG com sodipodi:namedview', () => {
    const body =
      '<sodipodi:namedview id="nv" inkscape:zoom="0.5"><inkscape:page x="0" y="0"/><inkscape:grid id="g" type="xygrid"/></sodipodi:namedview><g inkscape:groupmode="layer"><rect width="10" height="10"/></g>';
    const buffer = Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" ${INKSCAPE} ${SODIPODI} sodipodi:docname="a.svg" viewBox="0 0 956 1080">${body}</svg>`,
    );
    expect(validateArt(buffer, 'image/svg+xml')).toEqual(BOARD);
  });

  it('com namespaces de editor, ainda recusa elemento prefixado qualquer e xmlns padrão alheio', () => {
    for (const body of [
      `<html:iframe ${INKSCAPE.replace('inkscape', 'html')} srcdoc="x"/>`,
      '<sodipodi:script/>',
      '<g xmlns="http://www.w3.org/1999/xhtml"/>',
    ]) {
      const buffer = Buffer.from(
        `<svg xmlns="http://www.w3.org/2000/svg" ${INKSCAPE} ${SODIPODI} viewBox="0 0 956 1080">${body}</svg>`,
      );
      expect(validateArt(buffer, 'image/svg+xml').ok).toBe(false);
    }
  });

  it('aceita elementos SVG comuns, xlink e comentários', () => {
    const body =
      '<!-- <x:y/> --><defs><linearGradient id="g"><stop offset="0"/></linearGradient><clipPath id="c"><path d="M0 0"/></clipPath></defs><g><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#c"/><text><tspan>a</tspan></text></g>';
    expect(validateArt(svg(body), 'image/svg+xml')).toEqual(BOARD);
  });

  it('aceita url() com fragmento local, com e sem aspas', () => {
    const body = [
      '<defs><linearGradient id="a"/></defs>',
      '<rect fill="url(#a)"/>',
      '<rect fill="url(\'#a\')"/>',
      '<rect fill="url(&quot;#a&quot;)"/>',
      '<rect style="fill:url(#a)"/>',
      '<rect fill=\'url("#a")\'/>',
    ].join('');
    expect(validateArt(svg(body), 'image/svg+xml')).toEqual(BOARD);
  });

  it('aceita style sem escapes', () => {
    expect(
      validateArt(svg('<style>.a{fill:#fff}</style>'), 'image/svg+xml'),
    ).toEqual(BOARD);
  });

  it('aceita SVG na faixa do tema do card', () => {
    expect(
      validateArt(
        svg('', 'viewBox="0 0 1600 200" width="3200" height="400"'),
        'image/svg+xml',
      ),
    ).toEqual(BANNER);
    expect(
      validateArt(
        svg('', 'viewBox="0 0 1600 200" width="956"'),
        'image/svg+xml',
      ).ok,
    ).toBe(false);
  });

  it('recusa viewBox diferente', () => {
    const result = validateArt(
      svg('', 'viewBox="0 0 100 100"'),
      'image/svg+xml',
    );
    expect(result).toEqual({
      ok: false,
      reason: expect.stringContaining('956') as string,
    });
  });

  it('recusa width/height que não sejam o tamanho base ou o dobro', () => {
    const result = validateArt(
      svg('', 'viewBox="0 0 956 1080" width="500" height="500"'),
      'image/svg+xml',
    );
    expect(result.ok).toBe(false);
  });
});

describe('validateArt — PNG', () => {
  it('aceita 956x1080 e o dobro exato', () => {
    expect(validateArt(png(956, 1080), 'image/png')).toEqual(BOARD);
    expect(validateArt(png(1912, 2160), 'image/png')).toEqual(BOARD);
  });

  it('aceita a faixa do tema do card 1600x200 e o dobro', () => {
    expect(validateArt(png(1600, 200), 'image/png')).toEqual(BANNER);
    expect(validateArt(png(3200, 400), 'image/png')).toEqual(BANNER);
    expect(validateArt(png(1600, 400), 'image/png').ok).toBe(false);
  });

  it('recusa 500x500 e proporção parcial', () => {
    expect(validateArt(png(500, 500), 'image/png').ok).toBe(false);
    expect(validateArt(png(1912, 1080), 'image/png').ok).toBe(false);
  });

  it('recusa arquivo que não é PNG', () => {
    expect(validateArt(Buffer.from('GIF89a....'), 'image/png').ok).toBe(false);
  });
});

describe('validateArt — limites', () => {
  it('recusa arquivo acima de 200 KB', () => {
    const big = png(956, 1080, MAX_ART_BYTES);
    expect(validateArt(big, 'image/png')).toEqual({
      ok: false,
      reason: expect.stringContaining('200 KB') as string,
    });
  });

  it('recusa tipo de arquivo não suportado', () => {
    expect(validateArt(png(956, 1080), 'image/jpeg').ok).toBe(false);
  });
});

describe('chaves da arte', () => {
  const id = '3f2b8c1e-9a4d-4e7a-8b6c-0d1e2f3a4b5c';

  it('aceita só collectibles/tmp/<uuid>.(png|svg)', () => {
    expect(isTmpArtKey(`collectibles/tmp/${id}.png`)).toBe(true);
    expect(isTmpArtKey(`collectibles/tmp/${id}.svg`)).toBe(true);
    for (const key of [
      `collectibles/tmp/../x/${id}.png`,
      `collectibles/${id}.png`,
      `collectibles/tmp/${id}.jpg`,
      `collectibles/tmp/${id}.png/extra`,
      `empresas/1/collectibles/tmp/${id}.png`,
      'collectibles/tmp/not-a-uuid.png',
    ]) {
      expect(isTmpArtKey(key)).toBe(false);
    }
  });

  it('gera a chave final a partir da temporária', () => {
    expect(finalArtKey(`collectibles/tmp/${id}.svg`)).toBe(
      `collectibles/${id}.svg`,
    );
  });
});
