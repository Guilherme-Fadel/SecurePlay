import type { ComponentProps } from 'react';
import { cn } from '@/lib/utils';

type AppInputProps = Omit<ComponentProps<'input'>, 'type'> & {
  type?: 'text' | 'email' | 'url';
};

export function AppInput({ className, type = 'text', ...props }: AppInputProps) {
  return <input className={cn('app-text-input', className)} type={type} {...props} />;
}
