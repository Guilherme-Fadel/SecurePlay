import { useState } from 'react';
import { AulaDetalhes, QuizAnswer } from '@/services/conteudo';
import { useAulaProgress } from '@/hooks/useAulaProgress';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Trophy, ThumbsUp, BookOpen, Sparkles, ArrowRight } from 'lucide-react';

interface AulaQuizProps {
  aula: AulaDetalhes;
  onBack: () => void;
  onComplete: () => void;
}

export function AulaQuiz({ aula, onBack, onComplete }: AulaQuizProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<QuizAnswer[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [result, setResult] = useState<{ score: number; correctCount: number; totalQuestions: number; xpEarned: number } | null>(null);
  const { enviarQuiz, loading } = useAulaProgress();

  const questions = aula.quiz;
  const question = questions[currentQuestion];
  const isLastQuestion = currentQuestion >= questions.length - 1;

  const handleSelect = (index: number) => {
    if (showResult) return;
    setSelectedIndex(index);
  };

  const handleNext = async () => {
    if (selectedIndex === null) return;

    const newAnswers = [...answers, { questionId: question.id, selectedIndex }];
    setAnswers(newAnswers);

    if (isLastQuestion) {
      const quizResult = await enviarQuiz(aula.id, newAnswers);
      if (quizResult) {
        setResult(quizResult);
        setShowResult(true);
      }
    } else {
      setCurrentQuestion((prev) => prev + 1);
      setSelectedIndex(null);
    }
  };

  if (showResult && result) {
    const ResultIcon = result.score >= 80 ? Trophy : result.score >= 50 ? ThumbsUp : BookOpen;
    const resultVariant = result.score >= 80 ? 'accent' : result.score >= 50 ? 'primary' : 'secondary';

    return (
      <div className="flex flex-col items-center gap-6 p-6">
        <InfoCard variant={resultVariant as any} className="max-w-md w-full">
          <InfoCard.Section className="text-center py-6 flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--surface-alt)] flex items-center justify-center">
              <ResultIcon size={32} className={`text-[var(--${resultVariant})]`} />
            </div>

            <h3 className="text-[var(--text-primary)]">Resultado</h3>

            <p className="text-[var(--text-primary)] text-lg">
              {result.correctCount}/{result.totalQuestions} corretas
            </p>

            <p className="text-[var(--text-secondary)] font-[var(--font-family-inter)] text-sm">
              Score: {result.score}%
            </p>

            {result.xpEarned > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/10 rounded-xl">
                <Sparkles size={16} className="text-[var(--accent)]" />
                <span className="text-[var(--accent-text)] font-semibold">+{result.xpEarned} XP</span>
              </div>
            )}
          </InfoCard.Section>

          <InfoCard.Footer className="flex justify-center">
            <button
              onClick={onComplete}
              className="w-full py-2.5 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] font-semibold hover:bg-[var(--primary-hover)] transition-colors flex items-center justify-center gap-2"
            >
              Continuar <ArrowRight size={16} />
            </button>
          </InfoCard.Footer>
        </InfoCard>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="text-[var(--text-secondary)] hover:text-[var(--accent-text)] transition-colors">
          ← Voltar ao quadrinho
        </button>
        <span className="px-3 py-1 rounded-lg bg-[var(--primary)]/20 text-[var(--primary)] text-xs font-[var(--font-family-inter)] font-semibold">
          {currentQuestion + 1}/{questions.length}
        </span>
      </div>

      <div className="w-full h-1.5 bg-[var(--surface-alt)] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] rounded-full transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>

      <InfoCard variant="primary">
        <InfoCard.Section className="flex flex-col gap-5">
          <p className="text-[var(--text-primary)] text-lg leading-relaxed">
            {question.text}
          </p>

          <div className="flex flex-col gap-2.5">
            {question.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleSelect(index)}
                className={`w-full text-left p-4 rounded-xl border transition-all duration-200 ${
                  selectedIndex === index
                    ? 'border-[var(--accent)] bg-[var(--accent)]/10'
                    : 'border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--surface-alt)]'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-[var(--font-family-inter)] font-bold ${
                    selectedIndex === index
                      ? 'bg-[var(--accent)] text-[var(--background)]'
                      : 'bg-[var(--surface-alt)] text-[var(--text-secondary)]'
                  }`}>
                    {String.fromCharCode(65 + index)}
                  </div>
                  <span className={`font-[var(--font-family-inter)] text-sm ${
                    selectedIndex === index ? 'text-[var(--text-primary)]' : 'text-[var(--text-secondary)]'
                  }`}>
                    {option}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </InfoCard.Section>
      </InfoCard>

      <button
        onClick={handleNext}
        disabled={selectedIndex === null || loading}
        className="w-full py-3 rounded-xl bg-[var(--primary)] text-[var(--text-primary)] font-semibold hover:bg-[var(--primary-hover)] transition-colors disabled:opacity-30 flex items-center justify-center gap-2"
      >
        {loading ? 'Enviando...' : isLastQuestion ? 'Finalizar Quiz' : 'Próxima Pergunta →'}
      </button>
    </div>
  );
}
