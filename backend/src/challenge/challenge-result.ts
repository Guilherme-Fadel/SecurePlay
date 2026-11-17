import { NotFoundException } from '@nestjs/common';
import { Question } from '../question/question.entity';
import { AnswerDto } from './dto/challenge.dto';
import { validateAnswers } from '../common/gamification/validate-answers';

export interface ChallengeResult {
  score: number;
  correctCount: number;
  totalQuestions: number;
  pointsEarned: number;
  completed: boolean;
  corrections: Array<{
    questionId: number;
    correct: boolean;
    correctIndex: number;
    explanation: string | null;
  }>;
}

export function gradeChallenge(
  points: number,
  questions: Question[],
  answers: AnswerDto[],
): ChallengeResult {
  assertSubmittable(questions, answers);
  const byId = new Map(questions.map((question) => [question.id, question]));
  let correctCount = 0;
  const corrections = answers.map((answer) => {
    const question = byId.get(answer.questionId)!;
    const correct = question.correct_index === answer.selectedIndex;
    if (correct) correctCount++;
    return {
      questionId: question.id,
      correct,
      correctIndex: question.correct_index,
      explanation: question.explanation,
    };
  });
  const score = Math.min(
    100,
    Math.round((correctCount / questions.length) * 100),
  );
  return {
    score,
    correctCount,
    totalQuestions: questions.length,
    pointsEarned: Math.max(
      0,
      Math.min(points, Math.round((points * score) / 100)),
    ),
    completed: true,
    corrections,
  };
}

/** Formato do envio: desafio com perguntas e cada pergunta respondida uma vez. */
export function assertSubmittable(
  questions: Question[],
  answers: AnswerDto[],
): void {
  if (!questions.length)
    throw new NotFoundException(
      'Nenhuma pergunta encontrada para este desafio',
    );
  validateAnswers(questions, answers);
}

/** Grava só a primeira resposta da questão e a marca como respondida (certa ou errada). */
export function recordFirstAnswer(
  record: {
    selected_answers: Record<string, number> | null;
    answered_question_ids: number[];
  },
  questionId: number,
  selectedIndex: number,
): void {
  const selected = { ...(record.selected_answers ?? {}) };
  const key = String(questionId);
  if (!(key in selected)) selected[key] = selectedIndex;
  record.selected_answers = selected;
  record.answered_question_ids = Array.from(
    new Set([...(record.answered_question_ids ?? []), questionId]),
  );
}

/**
 * A primeira resposta gravada pelo PATCH de progresso prevalece sobre a do envio final; o
 * corpo só completa as questões sem registro (como a última, que a UI não salva por PATCH).
 * Tentativa aberta antes do registro (`recorded` nulo) usa o corpo, como antes.
 */
export function mergeRecordedAnswers(
  answers: AnswerDto[],
  recorded: Record<string, number> | null | undefined,
): AnswerDto[] {
  if (!recorded) return answers;
  return answers.map((answer) => {
    const saved = recorded[String(answer.questionId)];
    return Number.isInteger(saved)
      ? { questionId: answer.questionId, selectedIndex: saved }
      : answer;
  });
}
