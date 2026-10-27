import { createContext, useCallback, useContext, useId, useLayoutEffect, useReducer, type ReactNode } from 'react';
import { LoadingScreen } from '@/components/shared/LoadingScreen';

interface LoadingState { pending: Set<string>; visible: boolean; cycle: number }
type LoadingAction = { type: 'pending'; id: string; active: boolean } | { type: 'hidden' };
function reduceLoading(state: LoadingState, action: LoadingAction): LoadingState {
  if (action.type === 'hidden') return state.pending.size ? state : { ...state, visible: false };
  if (state.pending.has(action.id) === action.active) return state;
  const pending = new Set(state.pending);
  if (action.active) pending.add(action.id);
  else pending.delete(action.id);
  return { pending, visible: state.visible || action.active, cycle: state.cycle + (action.active && !state.visible ? 1 : 0) };
}
const PageLoadingContext = createContext<((id: string, active: boolean) => void) | null>(null);

/** Uma única tela persiste entre sessão, chunk da rota e bootstrap da Home. */
export function PageLoadingProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reduceLoading, { pending: new Set<string>(), visible: false, cycle: 0 });
  const setPending = useCallback((id: string, active: boolean) => dispatch({ type: 'pending', id, active }), []);
  return <PageLoadingContext.Provider value={setPending}>
    {children}
    {state.visible && <LoadingScreen key={state.cycle} ready={state.pending.size === 0} context="page" onHidden={() => dispatch({ type: 'hidden' })} />}
  </PageLoadingContext.Provider>;
}

export function usePageLoading(active: boolean) {
  const setPending = useContext(PageLoadingContext);
  const id = useId();
  if (!setPending) throw new Error('usePageLoading requires PageLoadingProvider');
  useLayoutEffect(() => {
    setPending(id, active);
    return () => setPending(id, false);
  }, [id, active, setPending]);
}
