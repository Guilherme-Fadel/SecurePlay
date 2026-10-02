import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';

interface AppSearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: string;
}

export function AppSearchInput({ label, className, ...props }: AppSearchInputProps) {
  return (
    <label className={cn('app-search-control', className)}>
      <Search size={16} aria-hidden="true" />
      <span className="sr-only">{label}</span>
      <input type="search" {...props} />
    </label>
  );
}
