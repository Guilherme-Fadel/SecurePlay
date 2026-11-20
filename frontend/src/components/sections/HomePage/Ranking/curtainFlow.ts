import { CURTAIN_MS } from './hallCurtainPaths';

export type CurtainPhase = 'closed' | 'opening' | 'closing' | 'open';

export interface CurtainState {
  phase: CurtainPhase;
  /** A cena que está no palco (a que a cortina já revelou). */
  shownKey: string;
  /** Luzes da ribalta acesas (só com a cortina aberta ou abrindo). */
  lit: boolean;
  /** Recém-aberta: placa, selo e setas sobem com atraso. */
  entering: boolean;
  confetti: boolean;
  /** Fechada por causa de uma consulta em andamento: abre assim que ela termina, sem a espera da entrada da tela. */
  held: boolean;
}

export interface CurtainInput {
  /** A cena da classificação que a tela tem agora (muda com escopo, categoria, período, temporada). */
  sceneKey: string;
  /** Uma consulta nova está a caminho: a cortina fica fechada até ela chegar. */
  pending: boolean;
  reduceMotion: boolean;
}

export const openedState = (shownKey: string): CurtainState => ({ phase: 'open', shownKey, lit: true, entering: false, confetti: false, held: false });
export const waitingState = (shownKey: string): CurtainState => ({ phase: 'closed', shownKey, lit: false, entering: false, confetti: false, held: false });

const closingState = (state: CurtainState): CurtainState => ({ ...state, phase: 'closing', lit: false, entering: false, confetti: false });
const openingState = (shownKey: string): CurtainState => ({ phase: 'opening', shownKey, lit: true, entering: true, confetti: false, held: false });

/**
 * Reage a uma mudança de cena ou de consulta. Aberta (ou abrindo), a cortina fecha assim que o filtro
 * muda (cena nova ou consulta em andamento). Fechada e sem consulta, só atualiza a cena que vai abrir.
 * Com movimento reduzido não há cortina: o palco fica aberto e já na cena atual. Devolve o mesmo
 * objeto quando nada muda.
 */
export function syncFlow(state: CurtainState, input: CurtainInput): CurtainState {
  const { sceneKey, pending, reduceMotion } = input;
  if (reduceMotion) return state.phase === 'open' && state.shownKey === sceneKey ? state : openedState(sceneKey);
  if (state.phase === 'open' || state.phase === 'opening') return pending || sceneKey !== state.shownKey ? closingState(state) : state;
  if (state.phase === 'closed' && !pending && state.shownKey !== sceneKey) return { ...state, shownKey: sceneKey };
  return state;
}

/** O fechamento terminou: com a consulta ainda em andamento a cortina espera fechada; senão abre com a cena mais recente. */
export function finishClosing(state: CurtainState, input: CurtainInput): CurtainState {
  if (state.phase !== 'closing') return state;
  return input.pending ? { ...state, phase: 'closed', held: true } : openingState(input.sceneKey);
}

/** Espera da fechada acabou: abre, a menos que haja consulta em andamento. */
export function finishWaiting(state: CurtainState, input: CurtainInput): CurtainState {
  if (state.phase !== 'closed' || input.pending) return state;
  return openingState(input.sceneKey);
}

/** Quanto a cortina fechada espera antes de abrir: a da entrada da tela ou, depois de uma consulta, nada. */
export function waitMs(state: CurtainState): number {
  return state.held ? 0 : CURTAIN_MS.wait;
}

/**
 * Aviso sobre o pano (ou, com movimento reduzido, sobre o palco) enquanto o filtro novo carrega.
 * Fica vazio fora disso.
 */
export function waitNotice(phase: CurtainPhase, pending: boolean, reduceMotion: boolean): string {
  if (!pending) return '';
  return reduceMotion || phase === 'closed' || phase === 'closing' ? 'Trocando o placar…' : '';
}
