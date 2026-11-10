import type { RankingData, RankingEntry, RankingMode, RankingSeasonOption } from '@/services/dashboard';

/*
 * Regras de exibição do Ranking (sem dependências de runtime, testável em Node).
 * O backend é a autoridade de posição, XP, empates e participação: aqui só se
 * escolhe o que mostrar e se derivam vizinhos da lista recebida (top 50).
 */

export type RankingScope = 'global' | 'company';

const DAY = 86_400_000;
const MANAGEMENT_ROLES = new Set(['admin', 'platform_admin', 'teacher']);

export const formatNumber = (value: number) => value.toLocaleString('pt-BR');
export const formatXp = (value: number) => `${formatNumber(value)} XP`;
export const ordinal = (position: number) => `${position}º`;

export function isManagementRole(role: string | null | undefined): boolean {
  return MANAGEMENT_ROLES.has(role ?? '');
}

/** Global só aparece quando a empresa liga e a conta não é trial (o backend também força a empresa). */
export function scopeOptions(globalEnabled: boolean, trial: boolean): RankingScope[] {
  return globalEnabled && !trial ? ['company', 'global'] : ['company'];
}

/** Começa em "Minha instituição"; sem instituição e com Global liberado, começa no Global. */
export function defaultScope(options: RankingScope[], hasCompany: boolean): RankingScope {
  return !hasCompany && options.includes('global') ? 'global' : 'company';
}

export function completenessLabel(value: RankingSeasonOption['completeness']): string {
  return value === 'complete' ? 'completa' : value === 'partial' ? 'parcial' : 'sem histórico completo';
}

/* ---------- Faixa da temporada ---------- */

export interface SeasonBand {
  name: string;
  when: string;
  /** Dias até o último dia da temporada atual (0 = hoje); null fora da temporada atual. */
  daysLeft: number | null;
  kind: 'active' | 'upcoming' | 'ended' | 'closed' | 'total';
}

const pad = (value: number) => String(value).padStart(2, '0');
const dayIndex = (year: number, month: number, day: number) => Math.round(Date.UTC(year, month - 1, day) / DAY);

/** Lê a data civil do texto ISO da temporada ("2026-12-01T00:00:00-03:00"), sem converter fuso. */
function civilDate(value: string | undefined): { year: number; month: number; day: number } | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

/**
 * Dia civil de hoje no fuso das temporadas (America/Sao_Paulo), para o prazo não
 * virar antes da hora em aparelhos com outro fuso. Sem Intl, usa a data local.
 */
function todayIndex(now: Date): number {
  try {
    const [year, month, day] = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(now).split('-').map(Number);
    if (year && month && day) return dayIndex(year, month, day);
  } catch { /* ambiente sem o fuso: segue com a data local */ }
  return dayIndex(now.getFullYear(), now.getMonth() + 1, now.getDate());
}

function shortDate(index: number): string {
  const date = new Date(index * DAY);
  return `${pad(date.getUTCDate())}/${pad(date.getUTCMonth() + 1)}`;
}

/**
 * Último dia da temporada: véspera de endsAt (exclusivo) vindo do backend;
 * sem data válida na temporada atual, o fim do mês civil corrente (temporada = mês civil).
 */
function lastDayIndex(endsAt: string | undefined, now: Date, fallbackToCivilMonth: boolean): number | null {
  const end = civilDate(endsAt);
  if (end) return dayIndex(end.year, end.month, end.day) - 1;
  if (!fallbackToCivilMonth) return null;
  return dayIndex(now.getFullYear(), now.getMonth() + 2, 1) - 1;
}

function closedBand(season: RankingData['season'] | undefined, now: Date, closedSeason?: RankingSeasonOption): SeasonBand {
  const name = closedSeason?.name ?? season?.name ?? 'Temporadas encerradas';
  const last = lastDayIndex(closedSeason?.endsAt ?? season?.endsAt, now, false);
  return { name, when: last === null ? 'Temporada encerrada' : `Encerrada em ${shortDate(last)}`, daysLeft: null, kind: 'closed' };
}

function deadlineText(daysLeft: number, date: string): string {
  if (daysLeft === 0) return `Termina hoje, ${date}`;
  if (daysLeft === 1) return `Termina amanhã, ${date}`;
  return `Termina em ${date} · faltam ${daysLeft} dias`;
}

function currentBand(season: RankingData['season'] | undefined, now: Date): SeasonBand {
  const name = season?.name ?? 'Temporada atual';
  if (season?.status === 'upcoming') {
    const start = civilDate(season.startsAt);
    return { name, when: start ? `Começa em ${pad(start.day)}/${pad(start.month)}` : 'Começa em breve', daysLeft: null, kind: 'upcoming' };
  }
  const last = lastDayIndex(season?.endsAt, now, true) ?? 0;
  const daysLeft = last - todayIndex(now);
  if (daysLeft < 0 || season?.status === 'closed') return { name, when: 'Temporada encerrada', daysLeft: null, kind: 'ended' };
  return { name, when: deadlineText(daysLeft, shortDate(last)), daysLeft, kind: 'active' };
}

/** Prazo da temporada exibida; atual = dias até o fim do mês da temporada. */
export function seasonBand(
  season: RankingData['season'] | undefined,
  mode: RankingMode,
  now: Date = new Date(),
  closedSeason?: RankingSeasonOption,
): SeasonBand {
  if (mode === 'total') return { name: 'Todas as temporadas', when: 'XP somado desde o começo', daysLeft: null, kind: 'total' };
  if (mode === 'season') return closedBand(season, now, closedSeason);
  return currentBand(season, now);
}

/* ---------- Participantes ---------- */

/** Lista recebida (até 50); versões antigas da API só traziam o top. */
export function leaderboardOf(ranking: RankingData): RankingEntry[] {
  return ranking.leaderboard?.length ? ranking.leaderboard : ranking.top ?? [];
}

/** Só aluno participante tem linha própria; gestão vê sem participar. */
export function viewerOf(ranking: RankingData): RankingEntry | null {
  return ranking.viewerParticipates && ranking.currentUser ? ranking.currentUser : null;
}

export function isViewerEntry(entry: RankingEntry, viewer: RankingEntry | null): boolean {
  return !!viewer && (entry.isCurrentUser === true || entry.id === viewer.id);
}

export interface PodiumSlot {
  entry: RankingEntry;
  /** Degrau pela posição do backend: empates dividem a altura e o número. */
  step: 1 | 2 | 3;
  /** Ordem visual 2º, 1º, 3º. */
  order: number;
  me: boolean;
}

const PODIUM_ORDER = [2, 1, 3];

export function podiumSlots(ranking: RankingData): PodiumSlot[] {
  const viewer = viewerOf(ranking);
  return leaderboardOf(ranking).slice(0, 3).map((entry, index) => ({
    entry,
    step: Math.min(3, Math.max(1, entry.position)) as 1 | 2 | 3,
    order: PODIUM_ORDER[index] ?? index + 1,
    me: isViewerEntry(entry, viewer),
  }));
}

export interface BoardModel {
  rows: Array<{ entry: RankingEntry; me: boolean }>;
  /** Sua linha quando você está fora da lista exibida (abaixo da 50ª). */
  viewerOutside: RankingEntry | null;
  /** A lista foi cortada pelo backend (mais participantes do que linhas). */
  truncated: boolean;
}

export function boardModel(ranking: RankingData): BoardModel {
  const viewer = viewerOf(ranking);
  const list = leaderboardOf(ranking);
  const rows = list.slice(3).map((entry) => ({ entry, me: isViewerEntry(entry, viewer) }));
  const inList = list.some((entry) => isViewerEntry(entry, viewer));
  return {
    rows,
    // currentUser não traz weeklyChange; a variação do aluno vem em weeklyPositionChange.
    viewerOutside: viewer && !inList ? { ...viewer, weeklyChange: viewer.weeklyChange ?? ranking.weeklyPositionChange ?? null } : null,
    truncated: list.length > 0 && ranking.totalParticipants > list.length,
  };
}

/* ---------- Sua corrida ---------- */

/**
 * Vizinho imediato de cima, igual ao Início: a lista vem limitada ao top 50 e
 * pointsToNextPosition é calculado sobre todos (pontos do próximo − seus + 1).
 * Só vale a entrada cuja distância bate com esse valor.
 */
export function neighborAbove(ranking: RankingData, viewer: RankingEntry): RankingEntry | null {
  const gap = ranking.summary?.pointsToNextPosition;
  if (!gap) return null;
  const above = leaderboardOf(ranking).filter((entry) => !isViewerEntry(entry, viewer) && entry.points > viewer.points);
  const candidate = above[above.length - 1];
  return candidate && candidate.points === viewer.points + gap - 1 ? candidate : null;
}

export type ChaseState =
  | { kind: 'final'; position: number }
  | { kind: 'start' }
  | { kind: 'leader' }
  | { kind: 'neighbor'; gap: number; neighbor: RankingEntry }
  | { kind: 'gap'; gap: number };

export interface RaceLane {
  entry: RankingEntry;
  me: boolean;
  /** Posição do corredor na pista, em %, proporcional ao XP do grupo. */
  x: number;
  /** Lado do nome em relação ao corredor (perto da chegada, à esquerda). */
  labelSide: 'left' | 'right';
}

export interface RaceModel {
  viewer: RankingEntry;
  participants: number;
  /** Você e até dois de cada lado; vazio quando você está fora da lista (sem nomes, B3 não existe). */
  lanes: RaceLane[];
  inList: boolean;
  chase: ChaseState;
}

function chaseState(ranking: RankingData, viewer: RankingEntry, inList: boolean): ChaseState {
  if (ranking.mode === 'season') return { kind: 'final', position: viewer.position };
  const gap = ranking.summary?.pointsToNextPosition ?? 0;
  if (!gap) return viewer.points > 0 ? { kind: 'leader' } : { kind: 'start' };
  if (viewer.position === 1) return { kind: 'leader' };
  // Fora da lista exibida (abaixo da 50ª), só o resumo em XP: sem nomes, mesmo se a distância bater.
  const neighbor = inList ? neighborAbove(ranking, viewer) : null;
  return neighbor ? { kind: 'neighbor', gap, neighbor } : { kind: 'gap', gap };
}

export function raceModel(ranking: RankingData): RaceModel | null {
  const viewer = viewerOf(ranking);
  if (!viewer) return null;
  const list = leaderboardOf(ranking);
  const index = list.findIndex((entry) => isViewerEntry(entry, viewer));
  let lanes: RaceLane[] = [];
  if (index >= 0) {
    const start = Math.max(0, Math.min(index - 2, list.length - 5));
    const group = list.slice(start, start + 5);
    const max = group[0]?.points ?? 0;
    const min = group[group.length - 1]?.points ?? 0;
    lanes = group.map((entry) => {
      const x = max === min ? 50 : 8 + ((entry.points - min) / (max - min)) * 84;
      return { entry, me: isViewerEntry(entry, viewer), x: Math.round(x * 10) / 10, labelSide: x > 55 ? 'left' : 'right' };
    });
  }
  return { viewer, participants: ranking.totalParticipants, lanes, inList: index >= 0, chase: chaseState(ranking, viewer, index >= 0) };
}

/* ---------- Semana ---------- */

export interface Trend { text: string; label: string; tone: 'up' | 'down' | 'same' | 'none' }

const plural = (count: number, one: string, many: string) => `${count} ${count === 1 ? one : many}`;

export function trendOf(change: number | null | undefined, available: boolean): Trend {
  if (!available || change === null || change === undefined) return { text: '—', label: 'sem dados da semana', tone: 'none' };
  if (change > 0) return { text: `▲ ${change}`, label: `subiu ${plural(change, 'posição', 'posições')} na semana`, tone: 'up' };
  if (change < 0) return { text: `▼ ${-change}`, label: `caiu ${plural(-change, 'posição', 'posições')} na semana`, tone: 'down' };
  return { text: '=', label: 'mesma posição da semana passada', tone: 'same' };
}

export function weeklyLine(change: number | null | undefined): { text: string; tone: 'up' | 'down' | 'same' } | null {
  if (change === null || change === undefined) return null;
  if (change > 0) return { text: `Subiu ${plural(change, 'posição', 'posições')} nesta semana`, tone: 'up' };
  if (change < 0) return { text: `Caiu ${plural(-change, 'posição', 'posições')} nesta semana`, tone: 'down' };
  return { text: 'Mesma posição da semana passada', tone: 'same' };
}

/* ---------- Pet anfitrião ---------- */

export interface HostSpeech { idle: string; lines: string[] }

type HighlightInput = { kind: 'streak' | 'xp' | 'challenges'; name: string; value: number };

function highlightLine(highlight: HighlightInput | null): string | null {
  if (!highlight) return null;
  if (highlight.kind === 'streak') return `${highlight.name} está com ${plural(highlight.value, 'dia seguido', 'dias seguidos')}!`;
  if (highlight.kind === 'xp') return `${highlight.name} fez ${formatXp(highlight.value)} na semana!`;
  return `${highlight.name} fez ${plural(highlight.value, 'desafio', 'desafios')} na semana!`;
}

function daysLine(band: SeasonBand): string {
  if (band.daysLeft === null) return 'Cada temporada é uma nova chance de subir!';
  if (band.daysLeft === 0) return 'Hoje é o último dia da temporada!';
  return `A temporada acaba em ${plural(band.daysLeft, 'dia', 'dias')}. Bora estudar?`;
}

function idleLine(band: SeasonBand, management: boolean): string {
  if (management) return 'Quem está mandando bem?';
  if (band.daysLeft !== null) return band.daysLeft === 0 ? 'Último dia! Bora subir?' : `Bora subir? Faltam ${plural(band.daysLeft, 'dia', 'dias')}!`;
  if (band.kind === 'closed') return 'Parabéns, turma!';
  if (band.kind === 'total') return 'Que jornada, hein?';
  return 'Cada aula conta!';
}

function chaseLine(chase: ChaseState): string {
  switch (chase.kind) {
    case 'neighbor':
    case 'gap':
      return `Faltam ${formatXp(chase.gap)} para subir uma posição!`;
    case 'leader':
      return 'Você está na frente! Segura essa coroa!';
    case 'final':
      return `Você terminou em ${ordinal(chase.position)} lugar. Mandou bem!`;
    default:
      return 'A primeira aula já coloca você na corrida!';
  }
}

/** Falas do pet anfitrião: estudo primeiro, sem chamar para jogar. */
export function hostSpeech(input: {
  band: SeasonBand;
  race: RaceModel | null;
  management: boolean;
  participants: number | null;
  highlight: HighlightInput | null;
}): HostSpeech {
  const { band, race, management, participants, highlight } = input;
  const first = management
    ? (participants === null ? null : `${plural(participants, 'aluno', 'alunos')} nesta classificação.`)
    : (race ? chaseLine(race.chase) : null);
  const lines = [
    first,
    'Cada aula e desafio vale XP.',
    highlightLine(highlight),
    management ? null : 'Termine um módulo e ganhe XP de bônus!',
    daysLine(band),
  ].filter((line): line is string => line !== null);
  return { idle: idleLine(band, management), lines };
}
