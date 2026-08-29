import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/utils';

type AppButtonVariant = 'primary' | 'secondary' | 'ghost' | 'soft';
type AppButtonSize = 'sm' | 'md';

interface AppButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: AppButtonVariant;
  size?: AppButtonSize;
  icon?: ReactNode;
}

export function AppButton({
  children,
  className,
  variant = 'primary',
  size = 'md',
  icon,
  type = 'button',
  ...props
}: AppButtonProps) {
  return (
    <button
      type={type}
      className={cn('app-button', `app-button--${variant}`, `app-button--${size}`, className)}
      {...props}
    >
      {icon}
      <span>{children}</span>
    </button>
  );
}
