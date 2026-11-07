import { useCallback, useEffect, useRef } from 'react';

/**
 * Move o foco para o título da etapa quando o aluno troca de etapa.
 * A retomada da última página (feita ao carregar a aula) não move o foco:
 * `arm(restoreKey)` liga o efeito e ignora a troca que leva à etapa restaurada.
 */
export function useLessonStepFocus(stepKey: string | number) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const armed = useRef(false);
  const awaiting = useRef<string | number | null>(null);

  useEffect(() => {
    if (!armed.current) return;
    if (awaiting.current !== null) {
      if (awaiting.current === stepKey) awaiting.current = null;
      return;
    }
    headingRef.current?.focus({ preventScroll: true });
    headingRef.current?.scrollIntoView?.({ block: 'nearest' });
  }, [stepKey]);

  const arm = useCallback((restoreKey: string | number | null) => {
    armed.current = true;
    awaiting.current = restoreKey;
  }, []);

  return { headingRef, arm };
}
