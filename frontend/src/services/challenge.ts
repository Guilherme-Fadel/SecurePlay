import { api } from '@/services/api';

export interface QuestionResponse {
  id: number;
  text: string;
  options: string[];
  order: number;
}

export interface ChallengeQuestionsResponse {
  challenge: {
    id: number;
    title: string;
    description: string;
    difficulty: string;
    duration: number;
    points: number;
  };
  questions: QuestionResponse[];
}

export interface AnswerPayload {
  questionId: number;
  selectedIndex: number;
}

export interface CorrectionItem {
  questionId: number;
  correct: boolean;
  correctIndex: number;
  explanation: string | null;
}

export interface SubmitResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  completed: boolean;
  corrections: CorrectionItem[];
}

export interface ChallengeStatus {
  completed: boolean;
  progress: number;
  answeredCount: number;
  totalQuestions: number;
  completedAt: string | null;
}

export interface SaveProgressResult {
  correct: boolean;
  answeredCount: number;
  totalQuestions: number;
  progress: number;
  completed: boolean;
}

export const getChallengeStatus = (id: number) =>
  api.get<ChallengeStatus>(`/challenges/${id}/status`).then(r => r.data);

export const saveChallengeProgress = (id: number, questionId: number, selectedIndex: number) =>
  api.patch<SaveProgressResult>(`/challenges/${id}/progress`, { questionId, selectedIndex }).then(r => r.data);

export const getChallengeQuestions = (id: number) =>
  api.get<ChallengeQuestionsResponse>(`/challenges/${id}/questions`).then(r => r.data);

export const submitChallengeAnswers = (id: number, answers: AnswerPayload[]) =>
  api.post<SubmitResult>(`/challenges/${id}/submit`, { answers }).then(r => r.data);
