import { useState, useCallback } from 'react';
import { concluirAula, submitQuiz, updateAulaProgress, QuizAnswer, QuizResult, ConcluirResult, UpdateAulaProgress } from '@/services/conteudo';
import { invalidate } from '@/lib/queryCache';

export function useAulaProgress() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const concluir = useCallback(async (aulaId: number): Promise<ConcluirResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await concluirAula(aulaId);
      invalidate('conteudoModulos');
      invalidate('dashboardStats');
      invalidate('dashboardJourney');
      invalidate('achievementRecent');
      invalidate('achievementTrail');
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao concluir aula';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const enviarQuiz = useCallback(async (aulaId: number, answers: QuizAnswer[]): Promise<QuizResult | null> => {
    setLoading(true);
    setError(null);

    try {
      const result = await submitQuiz(aulaId, answers);
      invalidate('conteudoModulos');
      invalidate('dashboardStats');
      invalidate('dashboardJourney');
      invalidate('achievementRecent');
      invalidate('achievementTrail');
      return result;
    } catch (err: any) {
      const message = err?.response?.data?.message || 'Erro ao enviar quiz';
      setError(message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const salvarProgresso = useCallback(async (aulaId: number, progress: UpdateAulaProgress) => {
    try {
      const result = await updateAulaProgress(aulaId, progress);
      invalidate('conteudoModulos');
      invalidate('dashboardJourney');
      return result;
    } catch {
      return null;
    }
  }, []);

  return { concluir, enviarQuiz, salvarProgresso, loading, error };
}
