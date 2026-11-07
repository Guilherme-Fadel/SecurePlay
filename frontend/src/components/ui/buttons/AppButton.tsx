import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft';
type AppButtonSize = 'sm' | 'control' | 'md';
export type AppChunkyTone = 'yellow' | 'blue' | 'ghost';
export type AppChunkySize = 'sm' | 'md' | 'big';

interface AppButtonBaseProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: ReactNode;
}

interface AppStandardButtonProps extends AppButtonBaseProps {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  tone?: never;
}

/** Botão da identidade: borda de 3px, sombra dura e afundamento ao pressionar.
 *  `yellow` usa a paleta fixa da marca; `blue` segue `--primary` (cor da escola). */
interface AppChunkyButtonProps extends AppButtonBaseProps {
  variant: 'chunky';
  tone?: AppChunkyTone;
  size?: AppChunkySize;
}

type AppButtonProps = AppStandardButtonProps | AppChunkyButtonProps;

function variantClasses(
  variant: AppButtonVariant | 'chunky' = 'primary',
  size: AppButtonSize | AppChunkySize = 'md',
  tone: AppChunkyTone = 'yellow',
): string[] {
  if (variant === 'chunky') {
    const chunkySize = size === 'control' ? 'md' : size;
    return ['app-button--chunky', `app-button--chunky-${tone}`, `app-button--chunky-${chunkySize}`];
  }
  const standardSize = size === 'big' ? 'md' : size;
  return [`app-button--${variant}`, `app-button--${standardSize}`];
}

export function AppButton({
  children,
  className,
  variant,
  size,
  tone,
  icon,
  type = 'button',
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={cn('app-button', ...variantClasses(variant, size, tone), className)}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
