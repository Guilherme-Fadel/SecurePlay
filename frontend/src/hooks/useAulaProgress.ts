import { useState, useCallback } from 'react';
import { isAxiosError } from 'axios';
import { concluirAula, submitQuiz, QuizAnswer, QuizResult, ConcluirResult } from '@/services/conteudo';
import { invalidateProgress } from '@/lib/progressCache';
import { useProgressSave } from './useProgressSave';

function failureMessage(error: unknown, fallback: string): string {
  const message: unknown = isAxiosError(error) ? error.response?.data?.message : null;
  return typeof message === 'string' && message.trim() ? message : fallback;
}

export function useAulaProgress() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { salvarProgresso, retryProgress, discardProgress, saveStatus } = useProgressSave();

  const concluir = useCallback(async (aulaId: number): Promise<ConcluirResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await concluirAula(aulaId);
      discardProgress();
      invalidateProgress();
      return result;
    } catch (err: unknown) {
      setError(failureMessage(err, 'Não foi possível confirmar a conclusão da aula.'));
      return null;
    } finally {
      setLoading(false);
    }
  }, [discardProgress]);

  const enviarQuiz = useCallback(async (aulaId: number, answers: QuizAnswer[]): Promise<QuizResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitQuiz(aulaId, answers);
      invalidateProgress();
      return result;
    } catch (err: unknown) {
      setError(failureMessage(err, 'Erro ao enviar quiz'));
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { concluir, enviarQuiz, salvarProgresso, retryProgress, saveStatus, loading, error };
}
