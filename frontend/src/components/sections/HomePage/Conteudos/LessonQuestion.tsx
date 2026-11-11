import { useEffect, useRef, type KeyboardEvent } from 'react';

/** Forma mínima da pergunta: compatível com o quiz da aula e com o da missão do dia. */
export interface LessonQuestionData {
  id: number;
  text: string;
  options: string[];
}

interface LessonQuestionProps {
  question: LessonQuestionData;
  /** Posição (0-based) da pergunta; o foco vai para o enunciado a cada troca. */
  index: number;
  total: number;
  /** Rótulo opcional à direita do cabeçalho ("Avaliação"); omita quando o contexto já o diz. */
  label?: string;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  /** Congela a escolha (ex.: salvando) sem tirar o foco das alternativas. */
  disabled?: boolean;
}

/**
 * Cabeçalho "Pergunta X de N", enunciado focável e radiogroup de alternativas.
 * Renderiza um fragmento: quem usa fornece o contêiner `lesson-page lesson-quiz`.
 */
export function LessonQuestion({ question, index, total, label, selectedIndex, onSelect, disabled = false }: LessonQuestionProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const optionsRef = useRef<HTMLDivElement | null>(null);

  // A pergunta só monta por ação do aluno e o botão que levou até ela some:
  // o foco vai para o enunciado na montagem e a cada troca de pergunta.
  useEffect(() => {
    headingRef.current?.focus({ preventScroll: true });
  }, [index, question.id]);

  /** Padrão de radiogroup: setas movem e selecionam; só a opção marcada entra no Tab. */
  const handleOptionKey = (event: KeyboardEvent<HTMLButtonElement>, optionIndex: number, count: number) => {
    const step = event.key === 'ArrowDown' || event.key === 'ArrowRight' ? 1 : event.key === 'ArrowUp' || event.key === 'ArrowLeft' ? -1 : 0;
    if (!step) return;
    event.preventDefault();
    if (disabled) return;
    const next = (optionIndex + step + count) % count;
    onSelect(next);
    optionsRef.current?.querySelectorAll<HTMLButtonElement>('[role="radio"]')[next]?.focus();
  };

  return (
    <>
      <div className="lesson-quiz-top"><span>Pergunta {index + 1} de {total}</span>{label && <span>{label}</span>}</div>
      <h2 ref={headingRef} tabIndex={-1} id={`lesson-question-${question.id}`}>{question.text}</h2>
      <div
        ref={optionsRef}
        className="lesson-options"
        role="radiogroup"
        aria-labelledby={`lesson-question-${question.id}`}
        aria-busy={disabled || undefined}
      >
        {question.options.map((option, optionIndex) => (
          <button
            key={`${question.id}-${optionIndex}`}
            type="button"
            role="radio"
            className="lesson-option"
            aria-checked={selectedIndex === optionIndex}
            aria-disabled={disabled || undefined}
            tabIndex={(selectedIndex ?? 0) === optionIndex ? 0 : -1}
            onClick={() => { if (!disabled) onSelect(optionIndex); }}
            onKeyDown={(event) => handleOptionKey(event, optionIndex, question.options.length)}
          >
            <b aria-hidden="true">{String.fromCharCode(65 + optionIndex)}</b><span>{option}</span>
          </button>
        ))}
      </div>
    </>
  );
}
