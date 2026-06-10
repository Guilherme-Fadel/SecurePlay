interface ProgressBarProps {
  progress: number;
  className?: string;
  height?: string;
}

export function ProgressBar({ progress, className = '', height = 'h-2' }: ProgressBarProps) {
  return (
    <div className={`w-full ${height} bg-[var(--background)] border-2 border-[var(--border)] ${className}`}>
      <div
        className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all duration-500"
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
