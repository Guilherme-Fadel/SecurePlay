interface ProgressBarProps {
  progress: number;
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent';
}

const variantGradients = {
  primary: 'from-[var(--primary)] to-[var(--accent)]',
  secondary: 'from-[var(--secondary)] to-[var(--primary)]',
  accent: 'from-[var(--accent)] to-[var(--primary)]',
};

export function ProgressBar({ progress, className = '', variant = 'primary' }: ProgressBarProps) {
  return (
    <div className={`w-full h-2 bg-[var(--surface-alt)] rounded-full overflow-hidden ${className}`}>
      <div
        className={`h-full bg-gradient-to-r ${variantGradients[variant]} rounded-full transition-all duration-500`}
        style={{ width: `${Math.min(progress, 100)}%` }}
      />
    </div>
  );
}
