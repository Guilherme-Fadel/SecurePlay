import type { CosmeticRarity, CosmeticType } from '@/services/achievements';
import { COLLECTIBLE_ART_MAX_BYTES, COLLECTIBLE_ART_TYPES, type CollectibleLayer } from '@/services/adminCollectibles';
import { ITEM_TYPES, RARITIES, slugify, type AdjustDraft, type ItemForm } from './adminCollectiblesForm';

/**
 * Leitura do arquivo `.json` exportado pelo organizador de artes (um item avulso por arquivo).
 * Só valida e converte: nada é salvo, e o backend continua sendo a autoridade quando o formulário for salvo.
 */

export const IMPORT_FORMAT = 'secureplay-colecionavel';
export const IMPORT_VERSION = 1;
/** Tamanho máximo do arquivo de importação. */
export const IMPORT_MAX_BYTES = 1024 * 1024;
export const IMPORT_TOO_BIG = 'O arquivo passa de 1 MB.';

/** Campos do formulário de item que o arquivo define; regra de liberação, data comemorativa e tema ficam como estão. */
export type ItemFormPatch = Pick<ItemForm, 'name' | 'description' | 'rarity' | 'price' | 'type' | 'layer' | 'adjust' | 'visualValue'> & { slug: string; slugEdited: true };

export type ImportArtType = (typeof COLLECTIBLE_ART_TYPES)[number];
export interface ImportArt { name: string; type: ImportArtType; base64: string }
export type CollectibleImport = { ok: true; form: ItemFormPatch; art: ImportArt | null } | { ok: false; error: string };

const fail = (error: string): { ok: false; error: string } => ({ ok: false, error });
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null && !Array.isArray(value);
const absent = (value: unknown): value is undefined | null => value === undefined || value === null;
const inRange = (value: unknown, min: number, max: number): value is number => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;

const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const DATA_URL = /^data:([^;,]+);base64,([A-Za-z0-9+/]*={0,2})$/;
const ART_KB = COLLECTIBLE_ART_MAX_BYTES / 1024;
const ART_INVALID = 'Os dados da arte estão inválidos ou não correspondem ao tipo informado.';

/** Uma recusa do arquivo, com a mensagem para o administrador; os leitores abaixo lançam, `parseCollectibleImport` captura. */
class ImportRefusal extends Error {}
function refuse(message: string): never { throw new ImportRefusal(message); }

function readName(raw: unknown): string {
  const name = typeof raw === 'string' ? raw.trim() : '';
  return name.length >= 2 && name.length <= 120 ? name : refuse('O nome deve ter de 2 a 120 caracteres.');
}

function readSlug(raw: unknown, name: string): string {
  if (absent(raw)) return slugify(name) || refuse('Não foi possível gerar o identificador (slug) a partir do nome. Informe um identificador no arquivo.');
  if (typeof raw === 'string' && raw.length <= 80 && SLUG.test(raw)) return raw;
  return refuse('O identificador (slug) deve usar letras minúsculas, números e hífens, até 80 caracteres.');
}

function readDescription(raw: unknown): string {
  if (absent(raw)) return '';
  return typeof raw === 'string' && raw.trim().length <= 400 ? raw.trim() : refuse('A descrição deve ser um texto de até 400 caracteres.');
}

function readType(raw: unknown): CosmeticType {
  return ITEM_TYPES.find((candidate) => candidate === raw) ?? refuse('O encaixe deve ser skin, head, face, neck, effect, background ou card.');
}

function readRarity(raw: unknown): CosmeticRarity {
  if (absent(raw)) return 'common';
  if (raw === 'festive') refuse('A raridade Comemorativa não pode ser importada, pois exige data e período. Use outra raridade e ajuste no formulário.');
  return RARITIES.find((candidate) => candidate === raw) ?? refuse('A raridade deve ser common, uncommon, rare, epic ou legendary.');
}

function readPrice(raw: unknown): number {
  const price = absent(raw) ? 0 : raw;
  return inRange(price, 0, 100000) && Number.isInteger(price) ? price : refuse('O preço deve ser um número inteiro de 0 a 100.000.');
}

/** A camada só vale para Efeito; nos demais encaixes é sempre "front". */
function readLayer(raw: unknown, type: CosmeticType): CollectibleLayer {
  const layer = absent(raw) ? 'front' : raw;
  if (layer !== 'front' && layer !== 'back') refuse('A camada deve ser front ou back.');
  return type === 'effect' ? layer : 'front';
}

function readAdjust(raw: unknown): AdjustDraft {
  if (absent(raw)) return { x: '0', y: '0', scale: '1' };
  if (!isRecord(raw)) refuse('O ajuste deve conter x, y e escala.');
  const x = absent(raw.x) ? 0 : raw.x;
  const y = absent(raw.y) ? 0 : raw.y;
  const scale = absent(raw.escala) ? 1 : raw.escala;
  if (!inRange(x, -500, 500) || !inRange(y, -500, 500)) refuse('A posição do ajuste (x e y) deve ser um número de -500 a 500.');
  if (!inRange(scale, 0.1, 5)) refuse('A escala do ajuste deve ficar entre 0,1 e 5.');
  return { x: String(x), y: String(y), scale: String(scale) };
}

/** Base64 do dataURL: mesmo tipo da arte, bem formado e até o limite do upload (medido antes de decodificar). */
function readBase64(raw: unknown, type: ImportArtType): string {
  const match = typeof raw === 'string' ? DATA_URL.exec(raw) : null;
  const base64 = match?.[2];
  if (match?.[1] !== type || base64 === undefined || base64.length % 4 !== 0) refuse(ART_INVALID);
  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  return (base64.length / 4) * 3 - padding > COLLECTIBLE_ART_MAX_BYTES ? refuse(`A arte passa de ${ART_KB} KB.`) : base64;
}

function readArt(raw: unknown): ImportArt | null {
  if (absent(raw)) return null;
  if (!isRecord(raw)) refuse('A arte do arquivo está em formato inválido.');
  const type = COLLECTIBLE_ART_TYPES.find((candidate) => candidate === raw.tipo) ?? refuse('A arte deve ser PNG ou SVG.');
  const name = typeof raw.nome === 'string' ? raw.nome.trim() : '';
  const fallback = type === 'image/png' ? 'arte.png' : 'arte.svg';
  return { name: name !== '' && name.length <= 120 ? name : fallback, type, base64: readBase64(raw.dados, type) };
}

function readItem(item: Record<string, unknown>): { form: ItemFormPatch; art: ImportArt | null } {
  const name = readName(item.nome);
  const type = readType(item.encaixe);
  const form: ItemFormPatch = {
    name, slug: readSlug(item.slug, name), slugEdited: true, description: readDescription(item.descricao), rarity: readRarity(item.raridade),
    price: String(readPrice(item.preco)), type, layer: readLayer(item.camada, type), adjust: readAdjust(item.ajuste), visualValue: '',
  };
  return { form, art: readArt(item.arte) };
}

/** Valida o texto do arquivo conforme o contrato do organizador e devolve os campos do formulário e a arte (se houver). */
export function parseCollectibleImport(text: string): CollectibleImport {
  try {
    if (text.length > IMPORT_MAX_BYTES) refuse(IMPORT_TOO_BIG);
    let data: unknown;
    try { data = JSON.parse(text); } catch { refuse('O arquivo não é um JSON válido.'); }
    if (!isRecord(data) || data.formato !== IMPORT_FORMAT) refuse('Este arquivo não é um colecionável exportado pelo organizador.');
    if (data.versao !== IMPORT_VERSION) refuse('Versão do arquivo não suportada.');
    if (!isRecord(data.item)) refuse('O arquivo não traz os dados do item.');
    return { ok: true, ...readItem(data.item) };
  } catch (failure) {
    if (failure instanceof ImportRefusal) return fail(failure.message);
    throw failure;
  }
}

/** Arquivo da arte importada, no formato que `uploadCollectibleArt` espera. */
export function artFileFromImport(art: ImportArt): File {
  const bytes = Uint8Array.from(atob(art.base64), (char) => char.charCodeAt(0));
  return new File([bytes], art.name, { type: art.type });
}
