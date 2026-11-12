import moduleFoundations from '@/assets/static/mission-room/module-foundations.webp';
import modulePasswords from '@/assets/static/mission-room/module-passwords.webp';
import moduleNavigation from '@/assets/static/mission-room/module-navigation.webp';
import modulePhishing from '@/assets/static/mission-room/module-phishing.webp';
import moduleAuthentication from '@/assets/static/mission-room/module-authentication.webp';
import levelEasy from '@/assets/static/mission-room/level-easy.webp';
import levelMedium from '@/assets/static/mission-room/level-medium.webp';
import levelHard from '@/assets/static/mission-room/level-hard.webp';

/** Trilha do mapa (viewBox 600 × 760), igual à prancheta "Landing · final". */
export const JOURNEY_PATH = 'M132 91 C 240 30, 372 46, 396 152 C 420 243, 228 243, 192 350 C 168 426, 420 410, 420 471 C 420 547, 240 547, 216 608 C 192 669, 360 699, 420 699';
export const JOURNEY_PATH_LENGTH = 1402;

/** Pontos amostrados ao longo da trilha, para o personagem caminhar sem medir o SVG a cada quadro. */
const POINTS: ReadonlyArray<readonly [number, number]> = [[132.0,91.0],[147.5,82.9],[163.4,75.7],[179.8,69.5],[196.5,64.3],[213.5,60.3],[230.8,57.4],[248.2,55.8],[265.7,55.6],[283.1,56.9],[300.3,59.9],[317.1,64.7],[333.3,71.4],[348.4,80.2],[362.0,91.2],[373.8,104.0],[383.4,118.6],[390.8,134.5],[395.8,151.2],[398.0,168.5],[394.4,185.5],[385.1,200.2],[372.4,212.3],[358.1,222.4],[343.1,231.2],[327.6,239.4],[312.0,247.3],[296.3,255.1],[280.8,263.2],[265.6,271.7],[250.7,281.0],[236.5,291.2],[223.3,302.6],[211.4,315.4],[201.3,329.7],[193.7,345.4],[190.5,362.4],[197.6,378.1],[211.2,389.0],[226.9,396.6],[243.4,402.5],[260.2,407.4],[277.2,411.6],[294.2,415.5],[311.3,419.2],[328.4,423.0],[345.5,426.9],[362.4,431.2],[379.1,436.4],[395.3,442.9],[410.1,452.2],[419.5,466.5],[418.2,483.8],[410.0,499.2],[397.6,511.4],[383.1,521.1],[367.5,529.1],[351.4,536.0],[335.1,542.2],[318.6,548.1],[302.1,553.9],[285.7,559.9],[269.4,566.4],[253.6,573.8],[238.5,582.6],[225.1,593.8],[215.8,608.5],[214.3,625.7],[222.4,641.0],[235.4,652.7],[250.3,661.7],[266.2,669.0],[282.6,675.1],[299.3,680.3],[316.2,684.7],[333.3,688.6],[350.5,691.9],[367.7,694.6],[385.1,696.8],[402.5,698.3],[420.0,699.0]];

/** Posição do personagem na trilha, em porcentagem do mapa. */
export function characterPosition(progress: number): { left: number; top: number } {
  const p = Math.min(1, Math.max(0, progress));
  const scaled = p * (POINTS.length - 1);
  const index = Math.min(POINTS.length - 2, Math.floor(scaled));
  const fraction = scaled - index;
  const start: readonly [number, number] = [132, 91];
  const [x0, y0] = POINTS[index] ?? start;
  const [x1, y1] = POINTS[index + 1] ?? POINTS[index] ?? start;
  const x = x0 + (x1 - x0) * fraction;
  const y = y0 + (y1 - y0) * fraction;
  return { left: x / 6, top: y / 7.6 };
}

export interface JourneyStop {
  name: string;
  image: string;
  lessons: number;
  /** Ponto da trilha (0 a 1) em que o personagem chega à parada. */
  at: number;
  left: number;
  top: number;
  /** A última parada começa bloqueada. */
  lockable?: boolean;
}

export const JOURNEY_STOPS: readonly JourneyStop[] = [
  { name: 'Fundamentos', image: moduleFoundations, lessons: 10, at: 0, left: 22, top: 12 },
  { name: 'Guardiões das Senhas', image: modulePasswords, lessons: 3, at: 0.2256, left: 66, top: 20 },
  { name: 'Defensores do Dispositivo', image: moduleNavigation, lessons: 3, at: 0.441, left: 32, top: 46 },
  { name: 'Detetives da Internet', image: modulePhishing, lessons: 3, at: 0.6407, left: 70, top: 62 },
  { name: 'Piloto 2026', image: moduleAuthentication, lessons: 0, at: 0.8246, left: 36, top: 80, lockable: true },
];

export interface Territory {
  name: string;
  description: string;
  icon: string;
  /** Trecho da trilha (0 a 1) que pertence ao território. */
  range: readonly [number, number];
  stageTop: number;
}

export const TERRITORIES: readonly [Territory, Territory, Territory] = [
  { name: 'Bosque dos Fundamentos', description: 'Aulas em quadrinhos, vídeo, texto e quiz para começar do zero.', icon: levelEasy, range: [0, 0.35], stageTop: 3.5 },
  { name: 'Vale dos Guardiões', description: 'Mais prática: jogos curtos treinam o olhar para golpes, senhas e segredos.', icon: levelMedium, range: [0.35, 0.7375], stageTop: 38 },
  { name: 'Cidadela Digital', description: 'Desafios maiores para quem já domina o básico.', icon: levelHard, range: [0.7375, 1], stageTop: 75.5 },
];

export function territoryProgress(progress: number, territory: Territory): number {
  const [start, end] = territory.range;
  return Math.round(Math.min(1, Math.max(0, (progress - start) / (end - start))) * 100);
}

export type StopState = 'done' | 'here' | 'next' | 'locked';
export type StepState = 'on' | 'done' | 'next';

export interface JourneySnapshot {
  key: string;
  stops: Array<{ state: StopState; caption: string }>;
  steps: Array<{ state: StepState; locked: boolean }>;
  territory: number;
  finished: boolean;
  current: string;
}

/** Estados discretos da jornada; só mudam ao cruzar uma parada ou um território. */
export function journeySnapshot(progress: number): JourneySnapshot {
  const p = Math.min(1, Math.max(0, progress));
  const finished = p >= 0.995;
  const territory = p < 0.35 ? 0 : p < 0.7375 ? 1 : 2;
  let last = 0;
  const stops = JOURNEY_STOPS.map((stop, index) => {
    const done = p >= stop.at + 0.02;
    const here = !done && p >= stop.at - 0.02;
    if (p >= stop.at - 0.02) last = index;
    const locked = Boolean(stop.lockable) && !done && !here;
    const state: StopState = done ? 'done' : here ? 'here' : locked ? 'locked' : 'next';
    const caption = stop.lockable
      ? (locked ? 'Bloqueado' : 'Liberado')
      : `${done ? stop.lessons : here ? 1 : 0}/${stop.lessons} aulas`;
    return { state, caption };
  });
  const steps = TERRITORIES.map((_, index) => {
    const on = index === territory;
    const done = index < territory || (finished && index === TERRITORIES.length - 1);
    const state: StepState = on ? 'on' : done ? 'done' : 'next';
    return { state, locked: index === TERRITORIES.length - 1 && territory < index };
  });
  const current = finished ? 'trilha completa' : JOURNEY_STOPS[last]?.name ?? '';
  const key = [territory, finished ? 1 : 0, last, ...stops.map((stop) => stop.state), ...steps.map((step) => step.state)].join('|');
  return { key, stops, steps, territory, finished, current };
}
