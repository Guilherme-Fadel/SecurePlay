import { Trophy, CheckCircle, XCircle, Star } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { SubmitResult, QuestionResponse, CorrectionItem } from '@/services/challenge';

interface Props {
  result: SubmitResult;
  questions: QuestionResponse[];
  onClose: () => void;
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizResult({ result, questions, onClose }: Props) {
  const { score, correctCount, totalQuestions, pointsEarned, completed, corrections } = result;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col items-center gap-2 py-2">
        <div className={cn(
          'w-16 h-16 rounded-full flex items-center justify-center',
          completed ? 'bg-[var(--primary-30)]' : 'bg-[var(--surface-alt)]'
        )}>
          {completed
            ? <Trophy size={32} style={{ color: 'var(--primary)' }} />
            : <Star size={32} style={{ color: 'var(--text-secondary)' }} />}
        </div>

        <h3 className={cn('font-semibold text-xl', completed ? 'text-[var(--primary)]' : 'text-[var(--text-primary)]')}>
          {completed ? 'Desafio Concluído!' : 'Continue Praticando!'}
        </h3>

        <p className="text-[var(--text-secondary)] text-sm text-center">
          Acertou <strong className="text-[var(--text-primary)]">{correctCount}</strong> de{' '}
          <strong className="text-[var(--text-primary)]">{totalQuestions}</strong>
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <StatBox label="Score" value={`${score}%`} />
        <StatBox label="XP Ganho" value={`+${pointsEarned}`} highlight />
      </div>

      <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1">
        <span className="text-[var(--text-secondary)] text-xs uppercase tracking-wide">Correções</span>

        {corrections.map((c: CorrectionItem) => {
          const q = questions.find(q => q.id === c.questionId);
          if (!q) return null;

          return (
            <div
              key={c.questionId}
              className={cn(
                'rounded-xl border p-3 flex flex-col gap-1',
                c.correct ? 'border-[var(--primary-30)] bg-[var(--primary-30)]' : 'border-[var(--danger)] bg-[var(--surface-alt)]'
              )}
            >
              <div className="flex items-start gap-2">
                {c.correct
                  ? <CheckCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
                  : <XCircle size={16} className="shrink-0 mt-0.5" style={{ color: 'var(--danger)' }} />}
                <span className="text-[var(--text-primary)] text-sm">{q.text}</span>
              </div>

              {!c.correct && (
                <span className="text-[var(--text-secondary)] text-xs ml-6">
                  Correta: <strong className="text-[var(--text-primary)]">{letters[c.correctIndex]}. {q.options[c.correctIndex]}</strong>
                </span>
              )}

              {c.explanation && (
                <span className="text-[var(--text-secondary)] text-xs ml-6 italic">{c.explanation}</span>
              )}
            </div>
          );
        })}
      </div>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors font-semibold"
      >
        Fechar
      </button>
    </div>
  );
}

function StatBox({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex flex-col items-center p-3 rounded-xl bg-[var(--surface-alt)] border border-[var(--border)]">
      <span className="text-[var(--text-secondary)] text-xs mb-1">{label}</span>
      <span
        className="text-2xl font-bold"
        style={{ color: highlight ? 'var(--primary)' : 'var(--text-primary)' }}
      >
        {value}
      </span>
    </div>
  );
}
