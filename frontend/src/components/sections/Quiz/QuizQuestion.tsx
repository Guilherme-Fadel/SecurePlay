import { cn } from '@/lib/utils';
import type { QuestionResponse } from '@/services/challenge';

interface Props {
  question: QuestionResponse;
  selectedIndex: number | null;
  onSelect: (i: number) => void;
}

const letters = ['A', 'B', 'C', 'D', 'E', 'F'];

export function QuizQuestion({ question, selectedIndex, onSelect }: Props) {
  return (
    <div className="flex flex-col gap-4">
      <p className="text-[var(--text-primary)] font-medium leading-relaxed">
        {question.text}
      </p>

      <div className="flex flex-col gap-2">
        {question.options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              'w-full text-left px-4 py-3 rounded-xl border-2 text-sm transition-all',
              selectedIndex === i
                ? 'border-[var(--primary)] bg-[var(--primary-30)] text-[var(--text-primary)]'
                : 'border-[var(--border)] bg-[var(--surface-alt)] text-[var(--text-secondary)] hover:border-[var(--primary)] hover:text-[var(--text-primary)]'
            )}
          >
            <span className={cn(
              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold mr-3',
              selectedIndex === i
                ? 'bg-[var(--primary)] text-white'
                : 'bg-[var(--border)] text-[var(--text-secondary)]'
            )}>
              {letters[i]}
            </span>
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}
