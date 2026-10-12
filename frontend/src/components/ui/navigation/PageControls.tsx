import { ChevronLeft, ChevronRight } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';

interface PageControlsProps {
  page: number;
  total: number;
  onChange: (page: number) => void;
  label: string;
}

export function PageControls({ page, total, onChange, label }: PageControlsProps) {
  if (total <= 1) return null;
  return <nav className="app-page-controls" aria-label={label}>
    <AppButton variant="ghost" size="sm" disabled={page <= 0} onClick={() => onChange(page - 1)} icon={<ChevronLeft size={16} />} aria-label={`${label}: página anterior`}>Anterior</AppButton>
    <span aria-live="polite">{page + 1} de {total}</span>
    <AppButton variant="ghost" size="sm" disabled={page >= total - 1} onClick={() => onChange(page + 1)} icon={<ChevronRight size={16} />} aria-label={`${label}: próxima página`}>Próxima</AppButton>
  </nav>;
}
