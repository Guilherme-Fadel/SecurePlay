import { useEffect, useRef, useState } from 'react';
import {
  finishClosing, finishWaiting, openedState, syncFlow, waitMs, waitingState, type CurtainInput, type CurtainState,
} from './curtainFlow';
import { CURTAIN_MS } from './hallCurtainPaths';

/**
 * Ciclo da cortina: começa fechada, abre quando a tela entra e, ao trocar um filtro, fecha, fica fechada
 * enquanto a consulta nova carrega, e abre com o resultado (só depois de terminar de fechar). Com
 * movimento reduzido não há cortina nem confete: o palco aparece aberto e troca direto. As regras
 * vivem em `curtainFlow.ts` (puras e testadas); aqui ficam só os temporizadores.
 */
export function useHallCurtain(sceneKey: string, pending: boolean, reduceMotion: boolean, celebrate: boolean) {
  const [state, setState] = useState<CurtainState>(() => (reduceMotion ? openedState(sceneKey) : waitingState(sceneKey)));
  const input: CurtainInput = { sceneKey, pending, reduceMotion };
  const latest = useRef({ input, celebrate });
  latest.current = { input, celebrate };
  const { phase, shownKey, confetti } = state;

  useEffect(() => {
    setState((current) => syncFlow(current, latest.current.input));
  }, [sceneKey, pending, reduceMotion, phase, shownKey]);

  // Fases temporizadas: fechada (sem consulta) espera e abre; fechando termina; abrindo termina e dispara o confete.
  useEffect(() => {
    if (reduceMotion) return undefined;
    const timers: number[] = [];
    const at = (ms: number, run: () => void) => { timers.push(window.setTimeout(run, ms)); };
    if (phase === 'closed' && !pending) at(waitMs(state), () => setState((current) => finishWaiting(current, latest.current.input)));
    if (phase === 'closing') at(CURTAIN_MS.closing, () => setState((current) => finishClosing(current, latest.current.input)));
    if (phase === 'opening') {
      at(CURTAIN_MS.opening, () => setState((current) => (current.phase === 'opening' ? { ...current, phase: 'open' } : current)));
      at(CURTAIN_MS.settle, () => setState((current) => (current.phase === 'opening' || current.phase === 'open' ? { ...current, entering: false, confetti: latest.current.celebrate } : current)));
    }
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [reduceMotion, phase, pending]);

  // O confete dura um instante e some sozinho.
  useEffect(() => {
    if (!confetti) return undefined;
    const timer = window.setTimeout(() => setState((current) => ({ ...current, confetti: false })), CURTAIN_MS.confetti);
    return () => window.clearTimeout(timer);
  }, [confetti]);

  return { ...state, confetti: state.confetti && !reduceMotion };
}
