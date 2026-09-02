import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export function initials(name: string | undefined | null) {
  return (name?.trim() || 'Você')
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');
}

interface AvatarProps {
  name?: string | null;
  nickname?: string | null;
  imageUrl?: string | null;
  className?: string;
  /** Conteúdo extra sobreposto (ex.: badge de cosmético). */
  children?: ReactNode;
  /** Quando true, o container recebe aria-hidden (uso decorativo). */
  decorative?: boolean;
}

export function Avatar({
  name,
  nickname,
  imageUrl,
  className,
  children,
  decorative = true,
}: AvatarProps) {
  const label = nickname || name;

  return (
    <span
      className={cn('sp-avatar', className)}
      aria-hidden={decorative ? true : undefined}
    >
      {imageUrl ? (
        <img
          className="sp-avatar-img"
          src={imageUrl}
          alt={decorative ? '' : `Foto de ${label ?? 'usuário'}`}
        />
      ) : (
        initials(label)
      )}
      {children}
    </span>
  );
}
