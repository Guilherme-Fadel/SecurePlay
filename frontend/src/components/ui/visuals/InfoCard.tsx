import React from 'react';
import { cn } from '@/lib/utils';


type CardVariant = 'default' | 'primary' | 'secondary' | 'accent' | 'danger';

const variantStyles: Record<CardVariant, { border: string; color: string }> = {
  default:   { border: 'border-[var(--border)]',       color: 'var(--text-secondary)' },
  primary:   { border: 'border-[var(--primary-30)]',   color: 'var(--primary)'        },
  secondary: { border: 'border-[var(--secondary-30)]', color: 'var(--secondary)'      },
  accent:    { border: 'border-[var(--accent-dark)]',  color: 'var(--accent)'         },
  danger:    { border: 'border-[var(--danger)]',       color: 'var(--danger)'         },
};

interface InfoCardProps {
  children: React.ReactNode;
  variant?: CardVariant;
  className?: string;
}

function InfoCardRoot({ children, variant = 'default', className }: InfoCardProps) {
  const { border } = variantStyles[variant];

  return (
    <div className={cn('bg-[var(--surface)] border rounded-2xl transition-all duration-300', border, className)}>
      {children}
    </div>
  );
}


interface InfoCardHeaderProps {
  title: string;
  subtitle?: string;
  icon?: React.ElementType;
  variant?: CardVariant;
  action?: React.ReactNode;
  className?: string;
}

function Header({ title, subtitle, icon: Icon, variant = 'default', action, className }: InfoCardHeaderProps) {
  const { color } = variantStyles[variant];

  return (
    <div className={cn('flex items-start justify-between p-4 border-b border-[var(--border)] rounded-t-2xl', className)}>
      <div className="flex items-center gap-3">
        {Icon && (
          <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-alt)]" style={{ color }}>
            <Icon size={18} />
          </div>
        )}
        <div>
          <h5 className="text-[var(--text-primary)] leading-tight">{title}</h5>
          {subtitle && <p className="text-[var(--text-secondary)]">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="ml-1 text-[var(--text-secondary)] text-lg shrink-1">{action}</div>}
    </div>
  );
}


interface InfoCardSectionProps {
  children: React.ReactNode;
  title?: string;
  className?: string;
}

function Section({ children, title, className }: InfoCardSectionProps) {
  return (
    <div className={cn('p-4', className)}>
      {title && <p className="text-[var(--text-secondary)] mb-3 tracking-wide uppercase text-xs">{title}</p>}
      {children}
    </div>
  );
}


interface InfoCardItemProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ElementType;
  variant?: CardVariant;
  className?: string;
}

function Item({ label, value, icon: Icon, variant = 'default', className }: InfoCardItemProps) {
  const { color } = variantStyles[variant];

  return (
    <div className={cn('flex items-center justify-between py-2 border-b border-[var(--border)] last:border-0', className)}>
      <div className="flex items-center gap-2 text-[var(--text-secondary)]">
        {Icon && <Icon size={14} style={{ color }} />}
        <span>{label}</span>
      </div>
      <div className="text-[var(--text-primary)] font-semibold">{value}</div>
    </div>
  );
}


interface InfoCardStatProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  icon?: React.ElementType;
  variant?: CardVariant;
  className?: string;
}

function Stat({ label, value, subtitle, icon: Icon, variant = 'default', className }: InfoCardStatProps) {
  const { color } = variantStyles[variant];

  return (
    <div className={cn('flex items-start justify-between', className)}>
      <div>
        <p className="text-[var(--text-secondary)]">{label}</p>
        <h4 className="text-[var(--text-primary)] leading-tight" style={{ color: variant !== 'default' ? color : undefined }}>
          {value}
        </h4>
        {subtitle && <p className="text-[var(--text-secondary)] mt-0.5">{subtitle}</p>}
      </div>
      {Icon && (
        <div className="w-9 h-9 flex items-center justify-center rounded-xl bg-[var(--surface-alt)] shrink-0" style={{ color }}>
          <Icon size={18} />
        </div>
      )}
    </div>
  );
}


interface InfoCardFooterProps {
  children: React.ReactNode;
  className?: string;
}

function Footer({ children, className }: InfoCardFooterProps) {
  return (
    <div className={cn('px-4 py-3 border-t border-[var(--border)] rounded-b-2xl flex items-center justify-between', className)}>
      {children}
    </div>
  );
}


export const InfoCard = Object.assign(InfoCardRoot, {
  Header,
  Section,
  Item,
  Stat,
  Footer,
});
