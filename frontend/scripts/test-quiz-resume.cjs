const assert = require("node:assert/strict");
const { test } = require("node:test");
const { load, hooks, settle } = require("./helpers/react-hooks.cjs");

const resume = load("src/lib/quizResume.ts", {});
const plain = (value) => JSON.parse(JSON.stringify(value));
const questions = [101, 102, 103, 104].map((id, i) => ({
  id,
  text: `Q${id}`,
  options: ["a", "b"],
  order: i + 1,
}));

test("retoma na primeira questão sem resposta gravada", () => {
  assert.equal(resume.resumeIndex(questions, []), 0);
  assert.equal(resume.resumeIndex(questions, [101, 102]), 2);
  // Lacuna: a primeira sem resposta vence, mesmo com respostas depois dela.
  assert.equal(resume.resumeIndex(questions, [101, 103]), 1);
  // Tudo gravado (caso raro): cai na última, que fecha o envio.
  assert.equal(resume.resumeIndex(questions, [101, 102, 103, 104]), 3);
});

test("pula as questões já gravadas ao avançar", () => {
  assert.equal(resume.nextUnansweredIndex(questions, [102], 0), 2);
  assert.equal(resume.nextUnansweredIndex(questions, [103, 104], 1), -1);
});

test("ignora IDs gravados que não pertencem às questões", () => {
  assert.deepEqual(
    plain(resume.validAnsweredIds(questions, [101, 999, 101])),
    [101],
  );
  assert.deepEqual(plain(resume.validAnsweredIds(questions, undefined)), []);
});

test("o envio inclui todas as questões, completando as gravadas com índice válido", () => {
  const body = resume.buildSubmitAnswers(
    questions,
    [
      { questionId: 103, selectedIndex: 1 },
      { questionId: 104, selectedIndex: 0 },
    ],
    [101, 102],
  );
  assert.deepEqual(plain(body), [
    { questionId: 101, selectedIndex: 0 },
    { questionId: 102, selectedIndex: 0 },
    { questionId: 103, selectedIndex: 1 },
    { questionId: 104, selectedIndex: 0 },
  ]);
});

function loadQuiz(api) {
  const h = hooks();
  const services = {
    getChallengeStatus: async () => ({ completed: false }),
    getChallengeQuestions: async () => ({
      questions,
      answeredQuestionIds: api.answeredQuestionIds,
    }),
    saveChallengeProgress: async (...args) => {
      api.saved.push(args);
    },
    submitChallengeAnswers: async (id, answers) => {
      api.submitted = answers;
      return { completed: true, corrections: [] };
    },
  };
  const { useQuiz } = load("src/hooks/useQuiz.ts", {
    react: h.react,
    "@/services/challenge": services,
    "@/lib/queryCache": { invalidate() {} },
    "@/lib/progressCache": { invalidateProgress() {} },
    "@/lib/quizResume": resume,
  });
  return { h, useQuiz };
}

test("useQuiz recomeça na primeira questão sem resposta e envia todas", async () => {
  const api = { answeredQuestionIds: [101, 102], saved: [], submitted: null };
  const { h, useQuiz } = loadQuiz(api);
  let quiz = h.render(() => useQuiz(5));
  await quiz.start();
  quiz = h.render(() => useQuiz(5));
  assert.equal(quiz.s.phase, "playing");
  assert.equal(quiz.s.index, 2);
  assert.deepEqual(plain(quiz.s.answeredIds), [101, 102]);

  quiz.select(1);
  quiz = h.render(() => useQuiz(5));
  await quiz.advance();
  quiz = h.render(() => useQuiz(5));
  assert.deepEqual(plain(api.saved), [[5, 103, 1]]);
  assert.equal(quiz.s.index, 3);

  quiz.select(0);
  quiz = h.render(() => useQuiz(5));
  await quiz.advance();
  quiz = h.render(() => useQuiz(5));
  assert.equal(quiz.s.phase, "submitting");
  assert.deepEqual(
    plain(quiz.s.answers.map((a) => a.questionId)),
    [101, 102, 103, 104],
  );
  await quiz.submit(quiz.s.answers);
  await settle();
  assert.equal(api.submitted.length, questions.length);
});

test("useQuiz com servidor sem a lista começa na primeira questão", async () => {
  const api = { answeredQuestionIds: undefined, saved: [], submitted: null };
  const { h, useQuiz } = loadQuiz(api);
  let quiz = h.render(() => useQuiz(5));
  await quiz.start();
  quiz = h.render(() => useQuiz(5));
  assert.equal(quiz.s.index, 0);
  assert.deepEqual(plain(quiz.s.answeredIds), []);
});
