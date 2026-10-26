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
  if (!questions.length)
    throw new NotFoundException(
      'Nenhuma pergunta encontrada para este desafio',
    );
  validateAnswers(questions, answers);
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
