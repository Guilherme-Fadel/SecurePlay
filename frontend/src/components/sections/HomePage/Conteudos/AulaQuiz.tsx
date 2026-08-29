import { useState } from 'react';
import { ArrowLeft, ArrowRight, BookOpen, Check, HelpCircle, Sparkles, ThumbsUp, Trophy } from 'lucide-react';
import type { AulaDetalhes, QuizAnswer } from '@/services/conteudo';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { AppButton } from '@/components/ui/buttons/AppButton';

interface AulaQuizProps {
  aula: AulaDetalhes;
  onBack: () => void;
  onComplete: () => void;
}

export function AulaQuiz({ aula, onBack, onComplete }: AulaQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number; xpEarned: number } | null>(null);
  const { enviarQuiz, loading, error } = useAulaProgress();

  const questions = aula.quiz;
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion >= questions.length - 1;
  const progress = questions.length ? ((currentQuestion + 1) / questions.length) * 100 : 0;

  const handleNext = async () => {
    if (selectedIndex === null || !question) return;
    const nextAnswers = [...answers, { questionId: question.id, selectedIndex }];
    setAnswers(nextAnswers);

    if (isLastQuestion) {
      const quizResult = await enviarQuiz(aula.id, nextAnswers);
      if (quizResult) setResult(quizResult);
      return;
    }

    setCurrentQuestion((current) => current + 1);
    setSelectedIndex(null);
  };

  if (!question && !result) {
    return <div className="learning-content-loading">Nenhuma pergunta disponível para esta avaliação.</div>;
  }

  if (result) {
    const ResultIcon = result.score >= 80 ? Trophy : result.score >= 50 ? ThumbsUp : BookOpen;
    return (
      <div className="learning-quiz-result">
        <div className="learning-quiz-result-emblem"><ResultIcon size={31} /></div>
        <span>AVALIAÇÃO CONCLUÍDA</span>
        <h2>{result.score >= 80 ? 'Excelente domínio!' : result.score >= 50 ? 'Bom progresso!' : 'Continue praticando'}</h2>
        <p>Você acertou {result.correctCount} de {result.totalQuestions} perguntas.</p>
        <div className="learning-quiz-score">
          <div><strong>{result.score}%</strong><span>desempenho</span></div>
          <div><Sparkles size={18} /><strong>+{result.xpEarned} XP</strong><span>recompensa</span></div>
        </div>
        <AppButton icon={<ArrowRight size={16} />} onClick={onComplete}>Continuar jornada</AppButton>
      </div>
    );
  }

  return (
    <div className="learning-quiz-workspace">
      <aside className="learning-quiz-rail">
        <div className="learning-quiz-icon"><HelpCircle size={27} /></div>
        <span>VERIFICAÇÃO DE CONHECIMENTO</span>
        <h2>Confirme o que aprendeu</h2>
        <p>Responda com atenção. A pontuação define a recompensa desta fase.</p>
        <div className="learning-quiz-map">
          {questions.map((_, index) => (
            <i key={index} className={`${index < currentQuestion ? 'is-complete' : ''} ${index === currentQuestion ? 'is-current' : ''}`}>
              {index < currentQuestion ? <Check size={12} /> : index + 1}
            </i>
          ))}
        </div>
        <AppButton variant="ghost" size="sm" icon={<ArrowLeft size={14} />} onClick={onBack}>Voltar à leitura</AppButton>
      </aside>

      <section className="learning-quiz-question">
        <div className="learning-quiz-question-top">
          <span>Questão {currentQuestion + 1} de {questions.length}</span>
          <strong>{Math.round(progress)}%</strong>
        </div>
        <div className="learning-quiz-question-progress"><div style={{ width: `${progress}%` }} /></div>
        <h2>{question.text}</h2>
        <div className="learning-quiz-options">
          {question.options.map((option, index) => (
            <button key={index} onClick={() => setSelectedIndex(index)} className={selectedIndex === index ? 'is-selected' : ''}>
              <i>{String.fromCharCode(65 + index)}</i><span>{option}</span><Check size={16} />
            </button>
          ))}
        </div>
        {error && <p className="learning-quiz-error">{error}</p>}
        <div className="learning-quiz-action">
          <span>{selectedIndex === null ? 'Selecione uma alternativa para continuar.' : 'Alternativa selecionada.'}</span>
          <AppButton onClick={handleNext} disabled={selectedIndex === null || loading} icon={<ArrowRight size={15} />}>
            {loading ? 'Enviando...' : isLastQuestion ? 'Finalizar avaliação' : 'Próxima pergunta'}
          </AppButton>
        </div>
      </section>
    </div>
  );
}
