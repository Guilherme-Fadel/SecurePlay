/** Regras da arte dos colecionáveis: tamanho, tipo, dimensões e SVG sem conteúdo ativo. */

export const MAX_ART_BYTES = 200 * 1024;
export const ART_WIDTH = 956;
export const ART_HEIGHT = 1080;

/**
 * Formatos aceitos: a prancheta do personagem (peças, skin, efeito e fundo do palco) e a faixa do
 * tema do card (8:1, alinhada à direita no card). Cada um no tamanho base ou no dobro.
 */
export const ART_FORMATS = {
  board: { width: ART_WIDTH, height: ART_HEIGHT },
  banner: { width: 1600, height: 200 },
} as const;
export type ArtFormat = keyof typeof ART_FORMATS;

/** O tema do card usa a faixa; todo o resto, a prancheta. */
export function artFormatFor(type: string): ArtFormat {
  return type === 'card' ? 'banner' : 'board';
}

export function artFormatLabel(format: ArtFormat) {
  const { width, height } = ART_FORMATS[format];
  return `${width}×${height} px (ou o dobro)`;
}

const ACCEPTED_SIZES = `${artFormatLabel('board')} nas peças ou ${artFormatLabel('banner')} no tema do card`;

function formatOfSize(width: number, height: number): ArtFormat | null {
  const found = (Object.keys(ART_FORMATS) as ArtFormat[]).find((format) => {
    const size = ART_FORMATS[format];
    return [1, 2].some(
      (k) => width === size.width * k && height === size.height * k,
    );
  });
  return found ?? null;
}

export const ART_MIME_BY_EXT = {
  png: 'image/png',
  svg: 'image/svg+xml',
} as const;
export type ArtExtension = keyof typeof ART_MIME_BY_EXT;

export type ArtValidation =
  | { ok: true; format: ArtFormat }
  | { ok: false; reason: string };

const TMP_KEY_PATTERN =
  /^collectibles\/tmp\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\.(png|svg)$/;

const PNG_SIGNATURE = Buffer.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

const invalid = (reason: string): ArtValidation => ({ ok: false, reason });

export function isTmpArtKey(key: unknown): key is string {
  return typeof key === 'string' && TMP_KEY_PATTERN.test(key);
}

export function tmpArtKey(uuid: string, ext: ArtExtension) {
  return `collectibles/tmp/${uuid}.${ext}`;
}

export function artExtensionOf(key: string): ArtExtension {
  return key.endsWith('.svg') ? 'svg' : 'png';
}

/** `collectibles/tmp/<uuid>.<ext>` -> `collectibles/<uuid>.<ext>`. */
export function finalArtKey(tmpKey: string) {
  const match = TMP_KEY_PATTERN.exec(tmpKey);
  if (!match) throw new Error('Chave temporária de arte inválida');
  return `collectibles/${match[1]}.${match[2]}`;
}

function validatePng(buffer: Buffer): ArtValidation {
  if (
    buffer.length < 24 ||
    !buffer.subarray(0, 8).equals(PNG_SIGNATURE) ||
    buffer.toString('ascii', 12, 16) !== 'IHDR'
  ) {
    return invalid('O arquivo não é um PNG válido.');
  }
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);
  const format = formatOfSize(width, height);
  if (!format) {
    return invalid(
      `O PNG deve ter ${ACCEPTED_SIZES}; recebido ${width}×${height}.`,
    );
  }
  return { ok: true, format };
}

const ROOT_TAG = /<svg\b[^>]*>/i;
const HREF = /(?:xlink:)?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function attributeOf(tag: string, name: string): string | null {
  const pattern = new RegExp(
    String.raw`\s${name}\s*=\s*(?:"([^"]*)"|'([^']*)')`,
    'i',
  );
  const match = pattern.exec(tag);
  return match ? (match[1] ?? match[2]) : null;
}

function sameSize(raw: string, allowed: number[]) {
  const value = Number(raw.trim().replace(/px$/i, ''));
  return allowed.includes(value);
}

const FORBIDDEN_TAG =
  /<\s*(?:[\w-]+:)?(?:script|foreignObject|animate|set|animateMotion|animateTransform)(?![\w-])/i;
const STYLE_ELEMENT =
  /<\s*(?:[\w-]+:)?style(?![\w-])[^>]*>([\s\S]*?)<\s*\/\s*(?:[\w-]+:)?style\s*>/gi;
const STYLE_ATTRIBUTE = /\sstyle\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const EXTERNAL_URL = /url\(\s*(?!(?:["']|&quot;|&apos;)?\s*#)/i;

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
/** Metadados de editor (Inkscape): o navegador os ignora ao desenhar. */
const EDITOR_NAMESPACES = new Set([
  'http://www.inkscape.org/namespaces/inkscape',
  'http://sodipodi.sourceforge.net/DTD/sodipodi-0.dtd',
]);
const EDITOR_ELEMENT = /^(?:inkscape:[\w.-]+|sodipodi:(?:namedview|guide))$/;

/** Elementos SVG de desenho permitidos; qualquer outro nome (inclusive com prefixo) é recusado. */
const ALLOWED_ELEMENTS = new Set([
  'svg',
  'g',
  'defs',
  'symbol',
  'use',
  'image',
  'path',
  'rect',
  'circle',
  'ellipse',
  'line',
  'polyline',
  'polygon',
  'text',
  'tspan',
  'textPath',
  'title',
  'desc',
  'metadata',
  'style',
  'marker',
  'linearGradient',
  'radialGradient',
  'stop',
  'pattern',
  'clipPath',
  'mask',
  'filter',
  'feBlend',
  'feColorMatrix',
  'feComponentTransfer',
  'feComposite',
  'feConvolveMatrix',
  'feDiffuseLighting',
  'feDisplacementMap',
  'feDistantLight',
  'feDropShadow',
  'feFlood',
  'feFuncA',
  'feFuncB',
  'feFuncG',
  'feFuncR',
  'feGaussianBlur',
  'feImage',
  'feMerge',
  'feMergeNode',
  'feMorphology',
  'feOffset',
  'fePointLight',
  'feSpecularLighting',
  'feSpotLight',
  'feTile',
  'feTurbulence',
]);

const COMMENT = /<!--[\s\S]*?-->/g;
const ELEMENT_NAME = /<\s*([A-Za-z_][\w:.-]*)/g;
const NAMESPACE_DECLARATION =
  /[\s"']xmlns(?::[\w.-]+)?\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
const SOURCE_ATTRIBUTE = /[\s"'/]src(?:doc)?\s*=/i;

function hasUnknownElement(text: string): boolean {
  const clean = text.replace(COMMENT, '');
  return [...clean.matchAll(ELEMENT_NAME)].some(
    (match) =>
      !ALLOWED_ELEMENTS.has(match[1]) && !EDITOR_ELEMENT.test(match[1]),
  );
}

function hasForeignNamespace(text: string): boolean {
  return [...text.matchAll(NAMESPACE_DECLARATION)].some((match) => {
    const value = (match[1] ?? match[2] ?? '').trim();
    return (
      value !== SVG_NAMESPACE &&
      value !== XLINK_NAMESPACE &&
      !EDITOR_NAMESPACES.has(value)
    );
  });
}

function hasEscapedStyle(text: string): boolean {
  const styles = [
    ...[...text.matchAll(STYLE_ELEMENT)].map((match) => match[1]),
    ...[...text.matchAll(STYLE_ATTRIBUTE)].map((match) => match[1] ?? match[2]),
  ];
  return styles.some((style) => style.includes(String.fromCharCode(92)));
}

const ACTIVE_CONTENT_CHECKS: [(text: string) => boolean, string][] = [
  [
    (text) => FORBIDDEN_TAG.test(text),
    'O SVG não pode conter script, foreignObject nem animações (animate/set).',
  ],
  [
    hasUnknownElement,
    'O SVG só pode conter elementos de desenho SVG conhecidos (sem iframe, embed, object, meta nem elementos com prefixo).',
  ],
  [hasForeignNamespace, 'O SVG só pode declarar os namespaces SVG e XLink.'],
  [
    (text) => SOURCE_ATTRIBUTE.test(text),
    'O SVG não pode conter os atributos src ou srcdoc.',
  ],
  [
    (text) => /javascript\s*:|data\s*:/i.test(text),
    'O SVG não pode conter javascript: nem data:.',
  ],
  [
    (text) => /[\s"'/]on[a-z]+\s*=/i.test(text),
    'O SVG não pode conter atributos de evento (on…=).',
  ],
  [
    (text) => /<!\s*(entity|doctype)/i.test(text),
    'O SVG não pode declarar DOCTYPE ou entidades.',
  ],
  [
    hasEscapedStyle,
    'O SVG não pode usar escapes com barra invertida em estilos.',
  ],
  [
    (text) => /@import/i.test(text) || EXTERNAL_URL.test(text),
    'O SVG só pode referenciar recursos locais (#fragmento).',
  ],
  [
    (text) =>
      [...text.matchAll(HREF)].some(
        (match) =>
          !(match[1] ?? match[2] ?? match[3] ?? '').trim().startsWith('#'),
      ),
    'O SVG só pode usar href para fragmentos locais (#id).',
  ],
];

function activeContentReason(text: string): string | null {
  const failed = ACTIVE_CONTENT_CHECKS.find(([forbidden]) => forbidden(text));
  return failed ? failed[1] : null;
}

function validateSvg(buffer: Buffer): ArtValidation {
  const text = buffer.toString('utf8');
  const root = ROOT_TAG.exec(text)?.[0];
  if (!root) return invalid('O arquivo não é um SVG válido.');
  const active = activeContentReason(text);
  if (active) return invalid(active);
  const viewBox = attributeOf(root, 'viewBox')
    ?.trim()
    .split(/[\s,]+/)
    .join(' ');
  const format = (Object.keys(ART_FORMATS) as ArtFormat[]).find(
    (f) => viewBox === `0 0 ${ART_FORMATS[f].width} ${ART_FORMATS[f].height}`,
  );
  if (!format) {
    return invalid(
      `O viewBox do SVG deve ser "0 0 ${ART_WIDTH} ${ART_HEIGHT}" nas peças ou "0 0 ${ART_FORMATS.banner.width} ${ART_FORMATS.banner.height}" no tema do card.`,
    );
  }
  const size = ART_FORMATS[format];
  const width = attributeOf(root, 'width');
  const height = attributeOf(root, 'height');
  if (
    (width !== null && !sameSize(width, [size.width, size.width * 2])) ||
    (height !== null && !sameSize(height, [size.height, size.height * 2]))
  ) {
    return invalid('width/height do SVG devem ser o tamanho base ou o dobro.');
  }
  return { ok: true, format };
}

export function validateArt(buffer: Buffer, mime: string): ArtValidation {
  if (buffer.length > MAX_ART_BYTES) {
    return invalid('O arquivo passa de 200 KB.');
  }
  if (mime === ART_MIME_BY_EXT.png) return validatePng(buffer);
  if (mime === ART_MIME_BY_EXT.svg) return validateSvg(buffer);
  return invalid('A arte deve ser PNG ou SVG.');
}
