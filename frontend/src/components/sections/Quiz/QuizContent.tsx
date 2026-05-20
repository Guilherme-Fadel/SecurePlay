import { useEffect } from 'react';
import { Loader2, AlertCircle, BadgeCheck } from 'lucide-react';
import { useQuiz } from '@/hooks/useQuiz';
import { QuizProgress } from './QuizProgress';
import { QuizQuestion } from './QuizQuestion';
import { QuizResult } from './QuizResult';

interface Props {
  challengeId: number;
  onComplete?: () => void;
}

export function QuizContent({ challengeId, onComplete }: Props) {
  const { s, start, select, advance, submit, reset } = useQuiz(challengeId);

  useEffect(() => { start(); return reset; }, [challengeId]);

  useEffect(() => {
    if (s.phase === 'submitting') submit(s.answers);
  }, [s.phase]);

  if (s.phase === 'idle' || s.phase === 'loading') {
    return <Feedback icon={Loader2} spin message="Carregando perguntas..." />;
  }

  if (s.phase === 'submitting') {
    return <Feedback icon={Loader2} spin message="Calculando resultado..." />;
  }

  if (s.phase === 'error') {
    return (
      <Feedback icon={AlertCircle} variant="danger" title="Algo deu errado" message={s.error}>
        <ActionBtn onClick={start}>Tentar novamente</ActionBtn>
      </Feedback>
    );
  }

  if (s.phase === 'already_completed') {
    return (
      <Feedback icon={BadgeCheck} title="Desafio já concluído" message={s.error}>
        <ActionBtn onClick={onComplete}>Fechar</ActionBtn>
      </Feedback>
    );
  }

  if (s.phase === 'result' && s.result) {
    return <QuizResult result={s.result} questions={s.questions} onClose={() => onComplete?.()} />;
  }

  const question = s.questions[s.index];
  if (!question) {
    return (
      <Feedback icon={AlertCircle} variant="danger" title="Sem perguntas" message="Este desafio não possui perguntas cadastradas.">
        <ActionBtn onClick={onComplete}>Fechar</ActionBtn>
      </Feedback>
    );
  }

  const last = s.index >= s.questions.length - 1;

  return (
    <div className="flex flex-col gap-4">
      <QuizProgress current={s.index} total={s.questions.length} />
      <QuizQuestion question={question} selectedIndex={s.selected} onSelect={select} />

      <button
        onClick={advance}
        disabled={s.selected === null}
        className="w-full px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors font-semibold disabled:opacity-40 disabled:cursor-not-allowed mt-2"
      >
        {last ? 'Finalizar' : 'Próxima'}
      </button>
    </div>
  );
}



function Feedback({ icon: Icon, spin, variant, title, message, children }: {
  icon: any; spin?: boolean; variant?: 'danger'; title?: string; message?: string | null; children?: React.ReactNode;
}) {
  const color = variant === 'danger' ? 'var(--danger)' : 'var(--primary)';
  return (
    <div className="flex flex-col items-center justify-center py-10 gap-3">
      <Icon size={32} className={spin ? 'animate-spin' : ''} style={{ color }} />
      {title && <p className="text-[var(--text-primary)] font-semibold">{title}</p>}
      {message && <p className="text-[var(--text-secondary)] text-sm text-center">{message}</p>}
      {children}
    </div>
  );
}

function ActionBtn({ onClick, children }: { onClick?: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className="mt-2 px-4 py-2 rounded-lg bg-[var(--primary)] text-[var(--text-primary)] hover:bg-[var(--primary-hover)] transition-colors font-semibold"
    >
      {children}
    </button>
  );
}
