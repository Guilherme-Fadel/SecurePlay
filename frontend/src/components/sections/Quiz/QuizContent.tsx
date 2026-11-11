import { useEffect, useId, useRef, type ReactNode, type Ref } from 'react';
import { CircleCheck, CircleX, Loader2, RotateCcw } from 'lucide-react';
import { useQuiz } from '@/hooks/useQuiz';
import type { QuestionResponse, SubmitResult } from '@/services/challenge';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { BrandCharacter, type BrandCharacterProps } from '@/components/shared/BrandCharacter';
import { LessonCheckpoint } from '@/components/sections/HomePage/Conteudos/LessonCheckpoint';
import { LessonQuestion } from '@/components/sections/HomePage/Conteudos/LessonQuestion';
import '@/styles/lesson.css';

interface Props {
  challengeId: number;
  onComplete?: () => void;
  onClose?: () => void;
}

const resultTitle = (score: number) => (score >= 80 ? 'Excelente domínio!' : score >= 50 ? 'Bom progresso!' : 'Continue praticando');

/**
 * Conteúdo do modal da missão do dia, com os blocos do quiz de fim de aula
 * (`.lesson-v--modal` neutraliza o layout de página; o corpo rolável vem do `Modal variant="card"`). Fases, salvamento e envio vêm de `useQuiz`.
 */
export function QuizContent({ challengeId, onComplete, onClose }: Props) {
  const { s, start, select, advance, submit, reset } = useQuiz(challengeId);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const { phase, answers } = s;

  useEffect(() => {
    void start();
    return reset;
  }, [start, reset]);

  useEffect(() => {
    if (phase === 'submitting') void submit(answers);
  }, [phase, answers, submit]);

  // O botão que enviou as respostas some: o foco vai para o título do resultado.
  useEffect(() => {
    if (phase === 'result') resultHeadingRef.current?.focus({ preventScroll: true });
  }, [phase]);

  let content: ReactNode;

  if (phase === 'idle' || phase === 'loading') {
    content = <QuizLoading message="Carregando perguntas..." />;
  } else if (phase === 'submitting') {
    content = <QuizLoading message="Calculando resultado..." />;
  } else if (phase === 'error') {
    content = (
      <QuizState
        expression="surprised"
        title="Algo deu errado"
        message={s.error}
        actions={<>
          <AppButton variant="chunky" tone="yellow" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={() => { void start(); }}>Tentar novamente</AppButton>
          <AppButton variant="chunky" tone="ghost" onClick={onClose}>Fechar</AppButton>
        </>}
      />
    );
  } else if (phase === 'already_completed') {
    content = (
      <QuizState
        expression="happy"
        title="Missão já concluída"
        message={s.error}
        actions={<AppButton variant="chunky" tone="blue" onClick={onComplete ?? onClose}>Fechar</AppButton>}
      />
    );
  } else if (phase === 'result' && s.result) {
    content = <QuizOutcome result={s.result} questions={s.questions} headingRef={resultHeadingRef} onRetry={() => { void start(); }} onComplete={onComplete} onClose={onClose} />;
  } else if (!s.questions[s.index]) {
    content = (
      <QuizState
        expression="surprised"
        title="Sem perguntas"
        message="Esta missão não possui perguntas cadastradas."
        actions={<AppButton variant="chunky" tone="ghost" onClick={onClose}>Fechar</AppButton>}
      />
    );
  } else {
    content = (
      <QuizPlaying
        question={s.questions[s.index]}
        index={s.index}
        total={s.questions.length}
        selected={s.selected}
        saving={phase === 'saving'}
        onSelect={select}
        onAdvance={() => { void advance(); }}
        onClose={onClose}
      />
    );
  }

  return <div className="lesson-v lesson-v--modal">{content}</div>;
}

function QuizOutcome({ result, questions, headingRef, onRetry, onComplete, onClose }: {
  result: SubmitResult;
  questions: QuestionResponse[];
  headingRef: Ref<HTMLHeadingElement>;
  onRetry: () => void;
  onComplete?: () => void;
  onClose?: () => void;
}) {
  return (
    <div className="lesson-page">
      <LessonCheckpoint
        headingRef={headingRef}
        eyebrow={result.completed ? 'Missão concluída!' : 'Missão não concluída'}
        title={resultTitle(result.score)}
        summary={`Você acertou ${result.correctCount} de ${result.totalQuestions} perguntas · ${result.score}% de desempenho.${result.completed ? '' : ' A missão ainda não foi concluída: tente de novo para concluir.'}`}
        xp={result.pointsEarned}
        actions={result.completed ? (
          <AppButton variant="chunky" tone="blue" onClick={onComplete}>Concluir</AppButton>
        ) : (
          <>
            <AppButton variant="chunky" tone="yellow" icon={<RotateCcw size={18} aria-hidden="true" />} onClick={onRetry}>Tentar novamente</AppButton>
            <AppButton variant="chunky" tone="ghost" onClick={onClose}>Fechar</AppButton>
          </>
        )}
      />
      <QuizReview result={result} questions={questions} />
    </div>
  );
}

function QuizPlaying({ question, index, total, selected, saving, onSelect, onAdvance, onClose }: {
  question: QuestionResponse;
  index: number;
  total: number;
  selected: number | null;
  saving: boolean;
  onSelect: (index: number) => void;
  onAdvance: () => void;
  onClose?: () => void;
}) {
  const last = index >= total - 1;
  return (
    <>
      <div className="lesson-page lesson-quiz">
        <LessonQuestion
          question={question}
          index={index}
          total={total}
          selectedIndex={selected}
          onSelect={onSelect}
          disabled={saving}
        />
      </div>
      <nav className="lesson-nav" aria-label="Navegação da missão">
        <AppButton variant="chunky" tone="ghost" size="sm" onClick={onClose}>Sair</AppButton>
        <span aria-live="polite">{selected === null ? 'Escolha uma alternativa' : `Missão · pergunta ${index + 1} de ${total}`}</span>
        <AppButton variant="chunky" tone="blue" onClick={onAdvance} disabled={selected === null || saving}>
          {saving ? 'Salvando...' : last ? 'Enviar respostas' : 'Confirmar resposta'}
        </AppButton>
      </nav>
    </>
  );
}

function QuizLoading({ message }: { message: string }) {
  return (
    <div className="lesson-page">
      <p className="lesson-empty lesson-loading" role="status" aria-busy="true">
        <Loader2 className="lesson-spin" size={22} aria-hidden="true" />
        <span>{message}</span>
      </p>
    </div>
  );
}

/** Erro, missão já concluída e missão sem perguntas, no padrão de `LessonState` (sem `h1` dentro do modal). */
function QuizState({ expression, title, message, actions }: {
  expression: BrandCharacterProps['expression'];
  title: string;
  message?: string | null;
  actions: ReactNode;
}) {
  const titleId = useId();
  return (
    <div className="lesson-page">
      <section className="lesson-state" aria-labelledby={titleId}>
        <div className="lesson-state-art" aria-hidden="true"><BrandCharacter expression={expression} /></div>
        <h3 id={titleId} className="lesson-display">{title}</h3>
        {message && <p role="alert">{message}</p>}
        <div className="lesson-state-actions">{actions}</div>
      </section>
    </div>
  );
}

/** Correções devolvidas pelo servidor; o cliente só exibe. */
function QuizReview({ result, questions }: { result: SubmitResult; questions: QuestionResponse[] }) {
  const items = result.corrections.flatMap((correction) => {
    const question = questions.find((item) => item.id === correction.questionId);
    return question ? [{ correction, question }] : [];
  });
  if (items.length === 0) return null;

  return (
    <section className="lesson-review" aria-labelledby="lesson-review-title">
      <h3 id="lesson-review-title">Correções</h3>
      <div className="lesson-review-scroll" role="region" aria-label="Lista de correções" tabIndex={0}>
        <ul className="lesson-review-list">
          {items.map(({ correction, question }) => {
            const correctOption = question.options[correction.correctIndex];
            return (
              <li key={correction.questionId} className={`lesson-review-item ${correction.correct ? 'is-correct' : 'is-wrong'}`}>
                {correction.correct
                  ? <CircleCheck size={20} aria-hidden="true" />
                  : <CircleX size={20} aria-hidden="true" />}
                <div className="lesson-review-body">
                  <p className="lesson-review-q"><span className="lesson-sr">{correction.correct ? 'Acertou: ' : 'Errou: '}</span>{question.text}</p>
                  {!correction.correct && correctOption !== undefined && (
                    <p className="lesson-review-answer">Correta: <strong>{String.fromCharCode(65 + correction.correctIndex)}. {correctOption}</strong></p>
                  )}
                  {correction.explanation && <p className="lesson-review-note">{correction.explanation}</p>}
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
