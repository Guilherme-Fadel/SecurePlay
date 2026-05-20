interface Props {
  current: number;
  total: number;
}

export function QuizProgress({ current, total }: Props) {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="mb-4">
      <div className="flex justify-between text-[var(--text-secondary)] text-sm mb-1">
        <span>Pergunta {current + 1} de {total}</span>
        <span>{pct}%</span>
      </div>
      <div className="w-full h-2 rounded-full bg-[var(--surface-alt)]">
        <div
          className="h-2 rounded-full bg-[var(--primary)] transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
