/**
 * Caminhos da area do aluno. Os IDs internos de `Section` (dashboard, conteudos,
 * desafios...) nao mudam; so o segmento exibido na URL. Este modulo e a unica
 * fonte desses caminhos, e fica livre de dependencias de runtime para poder ser
 * carregado direto pelos testes de node.
 */

export type StudentSection = 'dashboard' | 'conteudos' | 'desafios' | 'ranking' | 'conquistas' | 'perfil';

export const STUDENT_SEGMENTS: Record<StudentSection, string> = {
  dashboard: 'inicio',
  conteudos: 'aprender',
  desafios: 'jogos',
  ranking: 'ranking',
  conquistas: 'conquistas',
  perfil: 'perfil',
};

export const STUDENT_HOME_PATH = '/inicio';

const SEGMENT_TO_SECTION = Object.fromEntries(
  (Object.entries(STUDENT_SEGMENTS) as Array<[StudentSection, string]>).map(([section, segment]) => [segment, section]),
) as Record<string, StudentSection | undefined>;

const STUDENT_PATH = /^\/(inicio|aprender|jogos|ranking|conquistas|perfil)(?:\/([^/]+))?(?:\/([^/]+))?\/?$/;

/** Texto de URL: minusculo, sem acento, so [a-z0-9] separados por hifen (nunca ponto). */
export function slugify(title: string | null | undefined, maxLength = 60): string {
  if (!title) return '';
  const slug = title
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/&/g, ' e ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  if (slug.length <= maxLength) return slug;
  // Prefere cortar numa palavra inteira, desde que sobre mais da metade do limite.
  let cut = slug.slice(0, maxLength);
  if (slug.charAt(maxLength) !== '-') {
    const boundary = cut.lastIndexOf('-');
    if (boundary > maxLength / 2) cut = cut.slice(0, boundary);
  }
  return cut.replace(/-+$/g, '');
}

/** `8-senhas-fortes`; sem titulo aproveitavel, so o numero (`8`). */
export function contentSegment(id: number, title?: string | null): string {
  const slug = slugify(title);
  return slug ? `${id}-${slug}` : String(id);
}

/** Le o ID de `8-senhas-fortes` ou `8`. O slug e decorativo: so o numero vale. */
export function parseContentSegment(raw: string | undefined): number | null {
  if (typeof raw !== 'string') return null;
  const match = /^(\d{1,10})(?:-.*)?$/.exec(raw);
  if (!match) return null;
  const id = Number(match[1]);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export interface LearnRef {
  id: number;
  title?: string | null;
}

export const paths = {
  inicio: () => '/inicio',
  aprender: () => '/aprender',
  aprenderModulo: (modulo: LearnRef) => `/aprender/${contentSegment(modulo.id, modulo.title)}`,
  aprenderAula: (modulo: LearnRef, aula: LearnRef) =>
    `/aprender/${contentSegment(modulo.id, modulo.title)}/${contentSegment(aula.id, aula.title)}`,
  jogos: () => '/jogos',
  ranking: () => '/ranking',
  conquistas: () => '/conquistas',
  colecionaveis: () => '/conquistas?aba=colecionaveis',
  perfil: () => '/perfil',
};

/**
 * Caminho de uma secao do aluno. Em `conteudos` com alvo, `moduloSegment` permite
 * manter o slug que ja esta na URL (o link nao troca o texto so para navegar).
 */
export function studentSectionPath(
  section: StudentSection,
  target?: { moduloId: number; aulaId?: number; moduloSegment?: string } | null,
): string {
  const base = `/${STUDENT_SEGMENTS[section]}`;
  if (section !== 'conteudos' || !target) return base;
  const modulo = target.moduloSegment ? encodeURIComponent(target.moduloSegment) : String(target.moduloId);
  return `${base}/${modulo}${target.aulaId ? `/${target.aulaId}` : ''}`;
}

export interface StudentLocation {
  section: StudentSection;
  moduloRaw: string | null;
  aulaRaw: string | null;
  moduloId: number | null;
  aulaId: number | null;
}

function decodeSegment(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

/** Interpreta o pathname da area do aluno; `null` quando nao e uma rota dela. */
export function parseStudentPath(pathname: string): StudentLocation | null {
  const match = STUDENT_PATH.exec(pathname);
  if (!match) return null;
  const section = SEGMENT_TO_SECTION[match[1]];
  if (!section) return null;
  // Modulo e aula so existem em Aprender.
  if (section !== 'conteudos' && match[2] !== undefined) return null;
  const moduloRaw = match[2] === undefined ? null : decodeSegment(match[2]);
  const aulaRaw = match[3] === undefined ? null : decodeSegment(match[3]);
  return {
    section,
    moduloRaw,
    aulaRaw,
    moduloId: parseContentSegment(moduloRaw ?? undefined),
    aulaId: parseContentSegment(aulaRaw ?? undefined),
  };
}

/** Rotas novas do aluno mais o prefixo legado `/home`. */
export function isStudentAreaPath(pathname: string): boolean {
  return parseStudentPath(pathname) !== null || pathname === '/home' || pathname.startsWith('/home/');
}

/** Caminho novo equivalente a um `/home/...` antigo (sem search/hash). */
export function legacyHomeTarget(pathname: string): string {
  const [section, modulo, aula] = pathname.replace(/^\/home(?:\/|$)/, '').split('/').filter(Boolean);
  switch (section) {
    case 'conteudos':
      return `/aprender${modulo ? `/${modulo}${aula ? `/${aula}` : ''}` : ''}`;
    case 'desafios':
      return paths.jogos();
    case 'ranking':
      return paths.ranking();
    case 'conquistas':
      return paths.conquistas();
    case 'perfil':
      return paths.perfil();
    default:
      return STUDENT_HOME_PATH;
  }
}
