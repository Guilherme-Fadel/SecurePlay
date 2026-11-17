import type { AnswerPayload, QuestionResponse } from "@/services/challenge";

/** Próxima questão sem resposta gravada depois de `from` (-1 antes da primeira); -1 se não houver. */
export function nextUnansweredIndex(
  questions: QuestionResponse[],
  answeredIds: number[],
  from: number,
): number {
  const answered = new Set(answeredIds);
  for (let i = from + 1; i < questions.length; i++) {
    if (!answered.has(questions[i].id)) return i;
  }
  return -1;
}

/**
 * Onde o quiz recomeça: a primeira questão sem resposta gravada. Se todas já estão gravadas
 * (caso raro), cai na última, que é a que fecha o envio.
 */
export function resumeIndex(
  questions: QuestionResponse[],
  answeredIds: number[],
): number {
  const next = nextUnansweredIndex(questions, answeredIds, -1);
  return next === -1 ? Math.max(0, questions.length - 1) : next;
}

/** IDs gravados que de fato pertencem às questões carregadas. */
export function validAnsweredIds(
  questions: QuestionResponse[],
  answeredIds: number[] | undefined,
): number[] {
  const known = new Set(questions.map((question) => question.id));
  return Array.from(new Set(answeredIds ?? [])).filter((id) => known.has(id));
}

/**
 * Corpo do envio final: o servidor exige uma resposta para CADA questão. Para as já gravadas em
 * sessões anteriores o servidor ignora o corpo e usa a resposta gravada (primeira resposta vale,
 * para ninguém sondar o gabarito), então qualquer índice válido serve; usamos 0. As demais
 * seguem a resposta dada nesta sessão.
 */
export function buildSubmitAnswers(
  questions: QuestionResponse[],
  answers: AnswerPayload[],
  answeredIds: number[],
): AnswerPayload[] {
  const recorded = new Set(answeredIds);
  const given = new Map(answers.map((answer) => [answer.questionId, answer]));
  return questions.flatMap((question) => {
    const answer = given.get(question.id);
    if (answer) return [answer];
    return recorded.has(question.id)
      ? [{ questionId: question.id, selectedIndex: 0 }]
      : [];
  });
}
