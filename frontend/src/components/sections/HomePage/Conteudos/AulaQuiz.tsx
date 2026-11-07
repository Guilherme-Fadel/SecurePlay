import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ArrowRight } from 'lucide-react';
import type { AulaDetalhes, QuizAnswer, QuizResult } from '@/services/conteudo';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { LessonCheckpoint } from './LessonCheckpoint';

interface AulaQuizProps {
  aula: AulaDetalhes;
  /** Volta para a leitura (descarta as respostas ainda não enviadas). */
  onBack: () => void;
  /** "Seguir na trilha". */
  onComplete: () => void;
  /** "Rever a leitura" depois do resultado. */
  onReread: () => void;
  /** Resultado aceito pelo servidor (a aula fica concluída). */
  onResult?: (result: QuizResult) => void;
}

const resultTitle = (score: number) => (score >= 80 ? 'Excelente domínio!' : score >= 50 ? 'Bom progresso!' : 'Continue praticando');

/** Quiz embutido como etapa final. Acerto e XP vêm de `submitQuiz`; o cliente só exibe. */
export function AulaQuiz({ aula, onBack, onComplete, onReread, onResult }: AulaQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<QuizResult | null>(null);
  const { enviarQuiz, loading, error } = useAulaProgress();
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  const questions = aula.quiz;
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion >= questions.length - 1;

  // O quiz só monta por ação do aluno ("Ir para o quiz"); o botão que abriu some,
  // então o foco vai para a pergunta já na montagem e a cada troca de pergunta/resultado.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [currentQuestion, result]);

  /** Padrão de radiogroup: setas movem e selecionam; só a opção marcada entra no Tab. */
  const handleOptionKey = (event: KeyboardEvent<HTMLButtonElement>, index: number, total: number) => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    const next = (index + step + total) % total;
    setSelectedIndex(next);
    optionsRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  const handleNext = async () => {
    if (selectedIndex === null || !question) return;
    const nextAnswers = [...answers, { questionId: question.id, selectedIndex }];
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      const quizResult = await enviarQuiz(aula.id, nextAnswers);
      if (quizResult) {
        setResult(quizResult);
        onResult?.(quizResult);
      } else {
        setAnswers(answers);
      }
      return;
    }

    setCurrentQuestion((current) => current + 1);
    setSelectedIndex(null);
  };

  if (result) {
    return (
      <div className="lesson-page">
        <LessonCheckpoint
          headingRef={headingRef}
          title={resultTitle(result.score)}
          summary={`Você acertou ${result.correctCount} de ${result.totalQuestions} perguntas · ${result.score}% de desempenho.`}
          xp={result.xpEarned}
          actions={<>
            <AppButton variant="chunky" tone="blue" icon={<ArrowRight size={18} aria-hidden="true" />} onClick={onComplete}>Seguir na trilha</AppButton>
            <AppButton variant="chunky" tone="ghost" onClick={onReread}>Rever a leitura</AppButton>
          </>}
        />
      </div>
    );
  }

  if (!question) {
    return (
      <>
        <div className="lesson-page"><p className="lesson-empty" role="status">Nenhuma pergunta disponível para esta avaliação.</p></div>
        <nav className="lesson-nav" aria-label="Navegação do quiz">
          <AppButton variant="chunky" tone="ghost" size="sm" onClick={onBack}>Voltar à leitura</AppButton>
        </nav>
      </>
    );
  }

  return (
    <>
      <div className="lesson-page lesson-quiz">
        <div className="lesson-quiz-top"><span>Pergunta {currentQuestion + 1} de {questions.length}</span><span>Avaliação</span></div>
        <h2 ref={headingRef} tabIndex={-1} id={`lesson-question-${question.id}`}>{question.text}</h2>
        <div ref={optionsRef} className="lesson-options" role="radiogroup" aria-labelledby={`lesson-question-${question.id}`}>
          {question.options.map((option, index) => (
            <button
              key={`${question.id}-${index}`}
              type="button"
              role="radio"
              className="lesson-option"
              aria-checked={selectedIndex === index}
              tabIndex={(selectedIndex ?? 0) === index ? 0 : -1}
              onClick={() => setSelectedIndex(index)}
              onKeyDown={(event) => handleOptionKey(event, index, question.options.length)}
            >
              <b aria-hidden="true">{String.fromCharCode(65 + index)}</b><span>{option}</span>
            </button>
          ))}
        </div>
        {error && <p className="lesson-error" role="alert">{error}</p>}
      </div>
      <nav className="lesson-nav" aria-label="Navegação do quiz">
        <AppButton variant="chunky" tone="ghost" size="sm" onClick={onBack}>Voltar à leitura</AppButton>
        <span aria-live="polite">{selectedIndex === null ? 'Escolha uma alternativa' : `Quiz · pergunta ${currentQuestion + 1} de ${questions.length}`}</span>
        <AppButton variant="chunky" tone="blue" onClick={() => void handleNext()} disabled={selectedIndex === null || loading}>
          {loading ? 'Enviando...' : isLastQuestion ? 'Enviar respostas' : 'Confirmar resposta'}
        </AppButton>
      </nav>
    </>
  );
}
