import { useState } from 'react';
import { AulaDetalhes, QuizAnswer } from '@/services/conteudo';
import { useAulaProgress } from '@/hooks/useAulaProgress';
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
    return (
      <div className="flex flex-col items-center gap-6 py-8">
        <div className="bg-[var(--surface)] border-4 border-[var(--accent)] p-8 text-center max-w-md w-full" style={{ boxShadow: '4px 4px 0 #6a7a03' }}>
          <h2 className="text-3xl text-[var(--accent)] mb-4">Resultado</h2>

          <div className="text-5xl mb-4 flex justify-center">
            {result.score >= 80 ? <Trophy size={48} className="text-[var(--accent)]" /> : result.score >= 50 ? <ThumbsUp size={48} className="text-[var(--primary)]" /> : <BookOpen size={48} className="text-[var(--secondary)]" />}
          </div>

          <p className="text-2xl text-[var(--text-primary)] mb-2">
            {result.correctCount}/{result.totalQuestions} corretas
          </p>

          <p className="text-xl text-[var(--text-secondary)] mb-4">
            Score: {result.score}%
          </p>

          {result.xpEarned > 0 && (
            <div className="bg-[var(--background)] border-2 border-[var(--accent)] p-3 mb-4 flex items-center justify-center gap-2">
              <Sparkles size={18} className="text-[var(--accent)]" />
              <span className="text-2xl text-[var(--accent)]">+{result.xpEarned} XP</span>
            </div>
          )}

          <button
            onClick={onComplete}
            className="w-full py-3 bg-[var(--primary)] text-white text-xl border-4 border-[var(--accent)] hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
            style={{ boxShadow: '4px 4px 0 var(--primary)' }}
          >
            Continuar <ArrowRight size={18} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <button
          onClick={onBack}
          className="text-[var(--text-secondary)] hover:text-[var(--accent)] transition-colors text-lg"
        >
          ← Voltar ao quadrinho
        </button>
        <span className="px-3 py-1 bg-[var(--primary)] text-white text-sm border-2 border-[var(--accent)]">
          {currentQuestion + 1}/{questions.length}
        </span>
      </div>

      <div className="w-full h-2 bg-[var(--background)] border-2 border-[var(--border)]">
        <div
          className="h-full bg-[var(--accent)] transition-all duration-300"
          style={{ width: `${((currentQuestion + 1) / questions.length) * 100}%` }}
        />
      </div>

      <div className="bg-[var(--surface)] border-4 border-[var(--primary)] p-6" style={{ boxShadow: '4px 4px 0 var(--primary)' }}>
        <p className="text-xl text-[var(--text-primary)] mb-6 leading-relaxed">
          {question.text}
        </p>

        <div className="flex flex-col gap-3">
          {question.options.map((option, index) => (
            <button
              key={index}
              onClick={() => handleSelect(index)}
              className={`w-full text-left p-4 border-3 transition-all text-lg ${
                selectedIndex === index
                  ? 'border-[var(--accent)] bg-[var(--accent)]/10 text-[var(--text-primary)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]'
              }`}
              style={selectedIndex === index ? { boxShadow: '3px 3px 0 var(--accent)' } : { boxShadow: '2px 2px 0 var(--border)' }}
            >
              <span className="mr-3 text-[var(--primary)]">{String.fromCharCode(65 + index)}.</span>
              {option}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={handleNext}
        disabled={selectedIndex === null || loading}
        className="w-full py-3 bg-[var(--accent)] text-[var(--background)] text-xl border-4 border-[#6a7a03] hover:opacity-90 transition-opacity disabled:opacity-30"
        style={{ boxShadow: '4px 4px 0 #6a7a03' }}
      >
        {loading ? 'Enviando...' : isLastQuestion ? 'Finalizar Quiz' : 'Próxima Pergunta →'}
      </button>
    </div>
  );
}
