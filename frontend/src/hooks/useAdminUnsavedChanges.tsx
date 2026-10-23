import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useBlocker } from 'react-router-dom';
import { AppButton } from '@/components/ui/buttons/AppButton';

type SaveDraft = () => Promise<boolean>;
type GuardedAction = () => void;
type ActionGuard = (action: GuardedAction) => void;
const AdminActionGuardContext = createContext<{
  register: (guard: ActionGuard) => () => void;
  request: (action: GuardedAction) => void;
} | null>(null);

export function AdminActionGuardProvider({ children }: { children: ReactNode }) {
  const guardRef = useRef<ActionGuard | null>(null);
  const register = useCallback((guard: ActionGuard) => {
    guardRef.current = guard;
    return () => { if (guardRef.current === guard) guardRef.current = null; };
  }, []);
  const request = useCallback((action: GuardedAction) => {
    if (guardRef.current) guardRef.current(action);
    else action();
  }, []);
  const value = useMemo(() => ({ register, request }), [register, request]);
  return <AdminActionGuardContext.Provider value={value}>{children}</AdminActionGuardContext.Provider>;
}

export function useAdminGuardedAction() {
  const context = useContext(AdminActionGuardContext);
  if (!context) throw new Error('AdminActionGuardProvider ausente');
  return context.request;
}

export function useAdminUnsavedChanges(isDirty: boolean, saveDraft?: SaveDraft, busy = false) {
  const actionGuard = useContext(AdminActionGuardContext);
  const [pendingAction, setPendingAction] = useState<GuardedAction | null>(null);
  const approvedActionRef = useRef(false);
  const shouldBlock = isDirty || busy;
  useEffect(() => {
    if (!shouldBlock || !actionGuard) return;
    return actionGuard.register((action) => setPendingAction(() => action));
  }, [actionGuard, shouldBlock]);
  const allowNextNavigationRef = useRef(false);
  const blocker = useBlocker(() => {
    if (approvedActionRef.current) return false;
    if (allowNextNavigationRef.current) {
      allowNextNavigationRef.current = false;
      return false;
    }
    return shouldBlock;
  });
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [saving, setSaving] = useState(false);
  const blocked = blocker.state === 'blocked' || pendingAction !== null;
  const proceed = () => {
    if (pendingAction) {
      approvedActionRef.current = true;
      setPendingAction(null);
      pendingAction();
    } else if (blocker.state === 'blocked') blocker.proceed();
  };
  const reset = () => {
    setPendingAction(null);
    if (blocker.state === 'blocked') blocker.reset();
  };

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (blocked && !dialog.open) {
      dialog.showModal();
      dialog.querySelector<HTMLButtonElement>('[data-continue-editing]')?.focus();
    }
    if (!blocked && dialog.open) dialog.close();
  }, [blocked]);

  useEffect(() => {
    if (!shouldBlock) return;
    const warnBeforeUnload = (event: BeforeUnloadEvent) => {
      if (approvedActionRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warnBeforeUnload);
    return () => window.removeEventListener('beforeunload', warnBeforeUnload);
  }, [shouldBlock]);

  const saveAndLeave = async () => {
    if (!saveDraft || saving || busy || !blocked) return;
    setSaving(true);
    try {
      if (await saveDraft()) proceed();
    } finally {
      setSaving(false);
    }
  };

  const prompt = blocked ? (
    <dialog ref={dialogRef} className="admin-console-unsaved-dialog" aria-labelledby="admin-unsaved-title" onCancel={(event) => { event.preventDefault(); if (!saving && !busy) reset(); }}>
      <h2 id="admin-unsaved-title">Alterações não salvas</h2>
      <p>{saveDraft ? 'Este formulário tem alterações pendentes. Salve-as antes de sair ou descarte o rascunho.' : 'Este formulário tem alterações pendentes. Continue editando ou descarte o rascunho antes de sair.'}</p>
      <div className="admin-console-unsaved-actions">
        {saveDraft && <AppButton disabled={saving || busy} onClick={() => void saveAndLeave()}>{saving || busy ? 'Salvando…' : 'Salvar e sair'}</AppButton>}
        <AppButton variant="secondary" disabled={saving || busy} onClick={proceed}>Descartar e sair</AppButton>
        <AppButton variant="ghost" disabled={saving || busy} data-continue-editing onClick={reset}>Continuar editando</AppButton>
      </div>
    </dialog>
  ) : null;

  return {
    prompt,
    allowNextNavigation: () => { allowNextNavigationRef.current = true; },
  };
}
