/**
 * Monta as etapas da aula em texto a partir das strings de `pages`.
 *
 * Padrão do piloto (4 páginas, título + parágrafos separados por linha em branco):
 *   1. "Entenda o tema"       → parágrafos + "Objetivo: ..."
 *   2. "Situação para pensar" → parágrafos + "Sinal de alerta: ..."
 *   3. "Como agir"            → parágrafos
 *   4. "Peça apoio e reflita" → parágrafos; o último, se terminar em "?", vira a pergunta de reflexão
 *
 * Quando o padrão não bate (outra quantidade de páginas, títulos diferentes, página sem corpo),
 * cada página vira uma etapa "Página N" com seus parágrafos, sem destaques. Nada é inventado:
 * todo texto exibido sai das próprias páginas. Etapa = página, então a persistência por
 * `last_page` continua igual.
 */

export type LessonBlock =
  | { kind: 'paragraph'; text: string }
  | { kind: 'goal'; text: string }
  | { kind: 'alert'; text: string }
  | { kind: 'question'; text: string };

export type LessonStepKind = 'understand' | 'situation' | 'act' | 'reflect' | 'page';

export interface LessonStep {
  kind: LessonStepKind;
  /** Rótulo curto da trilha de etapas. */
  label: string;
  /** Título da página (padrão do piloto); null no fallback. */
  heading: string | null;
  blocks: LessonBlock[];
}

export interface LessonSteps {
  structured: boolean;
  steps: LessonStep[];
}

const PILOT_PATTERN: ReadonlyArray<{ kind: Exclude<LessonStepKind, 'page'>; label: string; heading: RegExp }> = [
  { kind: 'understand', label: 'Entenda', heading: /^entenda\b/i },
  { kind: 'situation', label: 'Situação', heading: /^situa[çc][ãa]o\b/i },
  { kind: 'act', label: 'Como agir', heading: /^como agir\b/i },
  { kind: 'reflect', label: 'Reflita', heading: /\breflit[ae]\b/i },
];

const MAX_HEADING_LENGTH = 80;
const GOAL_PREFIX = /^objetivo\s*:\s*/i;
const ALERT_PREFIX = /^sinal de alerta\s*:\s*/i;

/** Divide uma página em parágrafos (linha em branco), sem perder o texto. */
export function splitParagraphs(page: string | null | undefined): string[] {
  if (typeof page !== 'string') return [];
  return page
    .replace(/\r\n?/g, '\n')
    .split(/\n[ \t]*\n/)
    .map((part) => part.replace(/\s*\n\s*/g, ' ').trim())
    .filter(Boolean);
}

const capitalize = (text: string) => text.charAt(0).toLocaleUpperCase('pt-BR') + text.slice(1);

function looksLikeHeading(text: string): boolean {
  return text.length <= MAX_HEADING_LENGTH && !/[.!?:;]$/.test(text);
}

function prefixed(text: string, prefix: RegExp): string | null {
  if (!prefix.test(text)) return null;
  const rest = text.replace(prefix, '').trim();
  return rest ? capitalize(rest) : null;
}

function pilotBlocks(kind: Exclude<LessonStepKind, 'page'>, body: string[]): LessonBlock[] {
  const blocks: LessonBlock[] = body.map((text) => {
    const goal = kind === 'understand' ? prefixed(text, GOAL_PREFIX) : null;
    if (goal) return { kind: 'goal', text: goal };
    const alert = kind === 'situation' ? prefixed(text, ALERT_PREFIX) : null;
    if (alert) return { kind: 'alert', text: alert };
    return { kind: 'paragraph', text };
  });
  const last = blocks[blocks.length - 1];
  if (kind === 'reflect' && blocks.length > 1 && last?.kind === 'paragraph' && last.text.endsWith('?')) {
    blocks[blocks.length - 1] = { kind: 'question', text: last.text };
  }
  return blocks;
}

function pilotSteps(pages: readonly string[]): LessonStep[] | null {
  if (pages.length !== PILOT_PATTERN.length) return null;
  const steps: LessonStep[] = [];
  for (const [index, pattern] of PILOT_PATTERN.entries()) {
    const [heading, ...body] = splitParagraphs(pages[index]);
    if (!heading || !body.length || !looksLikeHeading(heading) || !pattern.heading.test(heading)) return null;
    steps.push({ kind: pattern.kind, label: pattern.label, heading, blocks: pilotBlocks(pattern.kind, body) });
  }
  return steps;
}

function fallbackSteps(pages: readonly string[]): LessonStep[] {
  return pages.map((page, index) => ({
    kind: 'page',
    label: `Página ${index + 1}`,
    heading: null,
    blocks: splitParagraphs(page).map((text) => ({ kind: 'paragraph', text })),
  }));
}

export function buildLessonSteps(pages: readonly string[] | null | undefined): LessonSteps {
  const list = Array.isArray(pages) ? pages.map((page) => (typeof page === 'string' ? page : '')) : [];
  const structured = pilotSteps(list);
  return structured ? { structured: true, steps: structured } : { structured: false, steps: fallbackSteps(list) };
}
