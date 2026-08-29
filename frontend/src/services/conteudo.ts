import { api } from '@/services/api';

export interface Modulo {
  id: number;
  title: string;
  description: string;
  thumbnail: string | null;
  type: 'video' | 'quadrinho' | 'misto';
  category: string;
  difficulty: 'iniciante' | 'intermediario' | 'avancado';
  xp_total: number;
  xp_bonus: number;
  order: number;
  totalAulas: number;
  completedAulas: number;
  progress: number;
  hasStarted: boolean;
  lastAccessedAt: string | null;
}

export interface AulaResumo {
  id: number;
  title: string;
  description: string | null;
  type: 'video' | 'quadrinho';
  duration: number;
  xp: number;
  order: number;
  section_name: string | null;
  status: 'completed' | 'unlocked' | 'locked';
  page_count: number;
  progress_percent: number;
  last_video_second: number;
  last_page: number;
  last_accessed_at: string | null;
}

export interface ModuloDetalhes extends Modulo {
  aulas: AulaResumo[];
}

export interface QuizQuestion {
  id: number;
  text: string;
  options: string[];
  order: number;
}

export interface AulaDetalhes {
  id: number;
  modulo_id: number;
  title: string;
  description: string | null;
  type: 'video' | 'quadrinho';
  content_url: string | null;
  pages: string[] | null;
  duration: number;
  xp: number;
  order: number;
  section_name: string | null;
  completed: boolean;
  progress: AulaProgress;
  quiz: QuizQuestion[];
}

export interface AulaProgress {
  percent: number;
  lastVideoSecond: number;
  lastPage: number;
  startedAt: string | null;
  lastAccessedAt: string | null;
}

export interface UpdateAulaProgress {
  progress_percent?: number;
  last_video_second?: number;
  last_page?: number;
}

export interface QuizAnswer {
  questionId: number;
  selectedIndex: number;
}

export interface QuizCorrection {
  questionId: number;
  correct: boolean;
  correctIndex: number;
}

export interface QuizResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  xpEarned: number;
  corrections: QuizCorrection[];
}

export interface ConcluirResult {
  sucesso: boolean;
  mensagem: string;
  xp_ganho: number;
}

export const getModulos = () =>
  api.get<Modulo[]>('/conteudo/modulos').then((r) => r.data);

export const getModulo = (id: number) =>
  api.get<ModuloDetalhes>(`/conteudo/modulos/${id}`).then((r) => r.data);

export const getAula = (id: number) =>
  api.get<AulaDetalhes>(`/conteudo/aulas/${id}`).then((r) => r.data);

export const concluirAula = (id: number) =>
  api.post<ConcluirResult>(`/conteudo/aulas/${id}/concluir`).then((r) => r.data);

export const updateAulaProgress = (id: number, progress: UpdateAulaProgress) =>
  api.patch<AulaProgress>(`/conteudo/aulas/${id}/progress`, progress).then((r) => r.data);

export const submitQuiz = (id: number, answers: QuizAnswer[]) =>
  api.post<QuizResult>(`/conteudo/aulas/${id}/quiz`, { answers }).then((r) => r.data);
