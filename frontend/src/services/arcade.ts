import { api } from '@/services/api';

export interface ArcadeGameDto {
  slug: string;
  title: string;
  description: string;
  tag: string;
  xp: number;
  status: 'AVAILABLE' | 'SOON';
  color: string;
  colorDark: string;
  image: string | null;
  gameType: 'quiz' | 'phishing' | 'data_classify' | 'client_only';
}

export interface TokenState {
  balance: number;
  cap: number;
  nextRegenAt: number | null;
  nextRegenInSeconds: number;
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
}

export interface StartRunResponse {
  runId: string;
  game: { slug: string; title: string; gameType: string };
  payload: { questions?: QuizQuestion[] } & Record<string, unknown>;
  tokens: TokenState;
}

export interface SubmitRunResponse {
  score: number;
  xpBase: number;
  multiplier: number;
  xpEarned: number;
  playsToday: number;
  feedback: unknown;
}

export interface QuizAnswer {
  questionId: number;
  selectedIndex: number;
}

export interface PhishingSampleView {
  id: number;
  kind: 'email' | 'site' | 'message';
  content: {
    sender?: string;
    subject?: string;
    body?: string;
    url?: string;
  };
}

export interface PhishingAnswer {
  sampleId: number;
  report?: boolean;
  signals?: string[];
}

export interface DataItemView {
  id: number;
  label: string;
}

export interface DataAnswer {
  itemId: number;
  level: string;
}

export const getArcadeGames = () =>
  api.get<ArcadeGameDto[]>('/arcade/games').then((r) => r.data);

export const getTokens = () =>
  api.get<TokenState>('/arcade/tokens').then((r) => r.data);

export const startRun = (slug: string) =>
  api.post<StartRunResponse>(`/arcade/games/${slug}/start`).then((r) => r.data);

export const submitRun = (
  runId: string,
  body: {
    quizAnswers?: QuizAnswer[];
    phishingAnswers?: PhishingAnswer[];
    dataAnswers?: DataAnswer[];
  },
) => api.post<SubmitRunResponse>(`/arcade/runs/${runId}/submit`, body).then((r) => r.data);
