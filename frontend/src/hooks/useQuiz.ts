import { useState, useCallback } from 'react';
import {
  getChallengeQuestions,
  getChallengeStatus,
  submitChallengeAnswers,
  saveChallengeProgress,
  type QuestionResponse,
  type SubmitResult,
  type AnswerPayload,
} from '@/services/challenge';
import { invalidate } from '@/lib/queryCache';

type Phase = 'idle' | 'loading' | 'playing' | 'saving' | 'submitting' | 'result' | 'error' | 'already_completed';

interface State {
  phase: Phase;
  questions: QuestionResponse[];
  index: number;
  answers: AnswerPayload[];
  selected: number | null;
  result: SubmitResult | null;
  error: string | null;
}

const INITIAL: State = {
  phase: 'idle',
  questions: [],
  index: 0,
  answers: [],
  selected: null,
  result: null,
  error: null,
};

export function useQuiz(challengeId: number) {
  const [s, set] = useState<State>(INITIAL);

  const start = useCallback(async () => {
    set({ ...INITIAL, phase: 'loading' });

    try {
      const { completed } = await getChallengeStatus(challengeId);

      if (completed) {
        set(prev => ({ ...prev, phase: 'already_completed', error: 'Você já completou este desafio.' }));
        return;
      }

      const { questions } = await getChallengeQuestions(challengeId);

      if (!questions?.length) {
        set(prev => ({ ...prev, phase: 'error', error: 'Nenhuma pergunta cadastrada para este desafio.' }));
        return;
      }

      set(prev => ({ ...prev, phase: 'playing', questions }));
    } catch (err: any) {
      set(prev => ({ ...prev, phase: 'error', error: err?.response?.data?.message || 'Falha ao carregar quiz.' }));
    }
  }, [challengeId]);

  const select = useCallback((optionIndex: number) => {
    set(prev => prev.phase === 'playing' ? { ...prev, selected: optionIndex } : prev);
  }, []);

  const advance = useCallback(async () => {
    if (s.phase !== 'playing' || s.selected === null) return;

    const answer = { questionId: s.questions[s.index].id, selectedIndex: s.selected };
    const updatedAnswers = [...s.answers, answer];
    const last = s.index >= s.questions.length - 1;

    if (last) {
      // A submissão final já persiste a tentativa. Evita que um PATCH atrasado
      // sobrescreva o registro concluído com um estado parcial.
      set(prev => ({ ...prev, answers: updatedAnswers, selected: null, phase: 'submitting' }));
      return;
    }

    set(prev => ({ ...prev, phase: 'saving' }));
    try {
      await saveChallengeProgress(challengeId, answer.questionId, answer.selectedIndex);
      invalidate(`challenge-status:${challengeId}`);
      set(prev => ({ ...prev, answers: updatedAnswers, index: prev.index + 1, selected: null, phase: 'playing' }));
    } catch (err: any) {
      set(prev => ({ ...prev, phase: 'error', error: err?.response?.data?.message || 'Falha ao salvar o progresso.' }));
    }
  }, [challengeId, s]);

  const submit = useCallback(async (answers: AnswerPayload[]) => {
    try {
      const result = await submitChallengeAnswers(challengeId, answers);
      set(prev => ({ ...prev, phase: 'result', result }));

      invalidate('dashboardStats');
      invalidate('dashboardDaily');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao enviar respostas.';
      // Falhas de envio, inclusive HTTP 400, não comprovam conclusão.
      // Só o status do servidor confirma se a tentativa foi gravada.
      const status = await getChallengeStatus(challengeId).catch(() => null);
      if (status?.completed) {
        set(prev => ({ ...prev, phase: 'already_completed', error: 'Você já completou este desafio.' }));
      } else {
        set(prev => ({ ...prev, phase: 'error', error: msg }));
      }
    }
  }, [challengeId]);

  const reset = useCallback(() => set(INITIAL), []);

  return { s, start, select, advance, submit, reset };
}
