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

type Phase = 'idle' | 'loading' | 'playing' | 'submitting' | 'result' | 'error' | 'already_completed';

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

  const advance = useCallback(() => {
    set(prev => {
      if (prev.selected === null) return prev;

      const answer = { questionId: prev.questions[prev.index].id, selectedIndex: prev.selected };
      const updatedAnswers = [...prev.answers, answer];
      const last = prev.index >= prev.questions.length - 1;

      saveChallengeProgress(challengeId, answer.questionId, answer.selectedIndex)
        .then(() => invalidate(`challenge-status:${challengeId}`))
        .catch(() => {});

      return {
        ...prev,
        answers: updatedAnswers,
        index: last ? prev.index : prev.index + 1,
        selected: null,
        phase: last ? 'submitting' : 'playing',
      };
    });
  }, [challengeId]);

  const submit = useCallback(async (answers: AnswerPayload[]) => {
    try {
      const result = await submitChallengeAnswers(challengeId, answers);
      set(prev => ({ ...prev, phase: 'result', result }));

      invalidate('dashboardStats');
      invalidate('dashboardDaily');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao enviar respostas.';
      const phase = err?.response?.status === 400 ? 'already_completed' : 'error';
      set(prev => ({ ...prev, phase, error: msg }));
    }
  }, [challengeId]);

  const reset = useCallback(() => set(INITIAL), []);

  return { s, start, select, advance, submit, reset };
}
