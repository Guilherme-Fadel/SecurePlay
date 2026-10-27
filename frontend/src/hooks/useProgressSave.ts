import { useCallback, useEffect, useRef, useState } from 'react';
import { updateAulaProgress, type UpdateAulaProgress } from '@/services/conteudo';
import { invalidate } from '@/lib/queryCache';

export type ProgressSaveStatus = 'idle' | 'saving' | 'saved' | 'pending';

/** Fila da tela atual: mantém somente o ponto mais recente, sem persistência offline. */
export function useProgressSave() {
  const [saveStatus, setSaveStatus] = useState<ProgressSaveStatus>('idle');
  const latest = useRef<{ aulaId: number; progress: UpdateAulaProgress } | null>(null);
  const running = useRef<Promise<unknown> | null>(null);
  const mounted = useRef(true);
  const generation = useRef(0);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      generation.current += 1;
      latest.current = null;
    };
  }, []);

  const drain = useCallback((): Promise<unknown> => {
    if (running.current) return running.current;
    const version = generation.current;
    const request = (async () => {
      while (mounted.current && version === generation.current && latest.current) {
        const point = latest.current;
        setSaveStatus('saving');
        try {
          const result = await updateAulaProgress(point.aulaId, point.progress);
          invalidate('conteudoModulos');
          invalidate('dashboardJourney');
          if (!mounted.current || version !== generation.current) return null;
          if (latest.current === point) {
            latest.current = null;
            setSaveStatus('saved');
            return result;
          }
        } catch {
          if (!mounted.current || version !== generation.current) return null;
          // Uma edição nova substitui o ponto que falhou; nunca reenviar o antigo.
          if (latest.current === point) {
            setSaveStatus('pending');
            return null;
          }
        }
      }
      return null;
    })().finally(() => {
      if (running.current === request) {
        running.current = null;
        if (mounted.current && latest.current && version !== generation.current) void drain();
      }
    });
    running.current = request;
    return request;
  }, []);

  const salvarProgresso = useCallback((aulaId: number, progress: UpdateAulaProgress) => {
    if (!mounted.current) return Promise.resolve(null);
    latest.current = { aulaId, progress: { ...progress } };
    return drain();
  }, [drain]);

  const retryProgress = useCallback(() => drain(), [drain]);
  const discardProgress = useCallback(() => {
    generation.current += 1;
    latest.current = null;
    if (mounted.current) setSaveStatus('idle');
  }, []);

  return { salvarProgresso, retryProgress, discardProgress, saveStatus };
}
