import { createContext, useContext, useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Camada onde os painéis do grupo de conta são desenhados. Fica fora da lista
 * rolável do trilho (que cortaria o painel) e dentro de `.secure-home`, para os
 * estilos de cosméticos com esse escopo continuarem valendo.
 */
export const RailLayerContext = createContext<HTMLElement | null>(null);

interface RailPopoverProps {
  id: string;
  label: string;
  className?: string;
  onClose: () => void;
  children: ReactNode;
}

/**
 * Painel não modal do grupo de conta: recebe o foco ao abrir, fecha com Escape
 * ou clique fora e devolve o foco a quem o abriu.
 */
export function RailPopover({ id, label, className = '', onClose, children }: RailPopoverProps) {
  const layer = useContext(RailLayerContext);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    panelRef.current?.focus();
    return () => {
      // Só devolve o foco se ele se perdeu com o fechamento (ficou no body).
      const active = document.activeElement;
      if (!active || active === document.body) opener?.focus();
    };
  }, []);

  useEffect(() => {
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [onClose]);

  return createPortal(
    <>
      <div className="sp-rail-backdrop" aria-hidden="true" onClick={onClose} />
      <div ref={panelRef} id={id} role="dialog" aria-label={label} tabIndex={-1} className={`sp-rail-popover ${className}`}>
        {children}
      </div>
    </>,
    layer ?? document.body,
  );
}
