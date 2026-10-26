import { BadRequestException } from '@nestjs/common';

/** Validação de domínio também protege chamadas internas que não passam pelo DTO. */
export function validateAnswers(
  questions: Array<{ id: number; options: string[] }>,
  answers: Array<{ questionId: number; selectedIndex: number }>,
): void {
  const byId = new Map(questions.map((question) => [question.id, question]));
  if (
    !Array.isArray(answers) ||
    answers.length !== questions.length ||
    new Set(answers.map((answer) => answer?.questionId)).size !==
      questions.length ||
    answers.some((answer) => {
      const question = byId.get(answer?.questionId);
      return (
        !question ||
        !Number.isInteger(answer.questionId) ||
        !Number.isInteger(answer.selectedIndex) ||
        answer.selectedIndex < 0 ||
        answer.selectedIndex >= question.options.length
      );
    })
  ) {
    throw new BadRequestException(
      'Responda cada pergunta uma vez com uma opção válida',
    );
  }
}
