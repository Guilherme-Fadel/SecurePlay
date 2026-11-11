import { useEffect, useId, useRef, type ReactNode, type RefObject } from 'react';
import { motion, AnimatePresence, useReducedMotion } from 'motion/react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
  Width?: string;
  Height?: string;
  maxWidth?: string;
  maxHeight?: string;
  /**
   * `default`: janela genérica (admin, perfil). `card`: moldura dos cartões da Home (borda
   * `--app-line`, raio 28, sombra dura), cabeçalho no estilo `.hv-card-head` e corpo rolável
   * sem padding, para conteúdo que cuida do próprio espaçamento (ex.: quiz da missão do dia).
   */
  variant?: 'default' | 'card';
  /** Sobretítulo caixa-alta acima do título; só aparece na variante `card`. */
  eyebrow?: string;
  /** Alvo do foco ao fechar quando quem abriu sumiu da tela (ex.: botão trocado por um aviso). */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Tab preso na janela, escutado no document: vale também quando o foco está no
 * próprio painel, no body (botão que ficou desabilitado) ou fora da janela.
 */
function trapTab(event: KeyboardEvent, panel: HTMLElement | null) {
  const items = focusableIn(panel);
  const first = items[0];
  const last = items[items.length - 1];
  if (!first || !last) {
    event.preventDefault();
    panel?.focus();
    return;
  }
  const active = document.activeElement;
  const inside = active instanceof HTMLElement && items.includes(active);
  if (!inside) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  } else if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
}

function focusableIn(root: HTMLElement | null): HTMLElement[] {
  if (!root) return [];
  return [...root.querySelectorAll<HTMLElement>(FOCUSABLE)].filter((el) => !el.closest('[aria-hidden="true"]'));
}

/**
 * Acessibilidade do diálogo (fechamento do redesign): `role="dialog"` +
 * `aria-modal`, nome pelo título, foco inicial no primeiro campo/controle,
 * Tab preso dentro da janela e foco devolvido a quem abriu ao fechar.
 */
function useDialogFocus(open: boolean, panelRef: RefObject<HTMLDivElement | null>, returnFocusRef?: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!open) return;
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const frame = window.requestAnimationFrame(() => {
      const panel = panelRef.current;
      const items = focusableIn(panel);
      // Prefere o primeiro campo do conteúdo ao botão de fechar.
      const target = items.find((el) => !el.hasAttribute('data-modal-close')) ?? items[0] ?? panel;
      target?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      const target = opener?.isConnected ? opener : returnFocusRef?.current;
      target?.focus({ preventScroll: true });
    };
  }, [open, panelRef, returnFocusRef]);
}

export function Modal({
  open,
  onClose,
  children,
  title,
  Width = '',
  Height = '',
  maxWidth = 'max-w-350',
  maxHeight,
  variant = 'default',
  eyebrow,
  returnFocusRef,
}: ModalProps) {
  const card = variant === 'card';
  const titleId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const reduceMotion = useReducedMotion() === true;
  useDialogFocus(open, panelRef, returnFocusRef);

  useEffect(() => {
    if (!open) return;

    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'Tab') trapTab(e, panelRef.current);
    }

    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const duration = reduceMotion ? 0 : 0.2;

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => onClose()}
            aria-hidden="true"
          />

          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-label={title ? undefined : 'Janela'}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration, ease: 'easeOut' }}
            className={card
              ? `app-modal app-modal--card relative z-10 w-full ${maxWidth} ${maxHeight ?? ''} ${Height} ${Width} mx-4 outline-none`
              : `app-modal relative z-10 w-full ${maxWidth} ${maxHeight ?? 'max-h-250'} ${Height} ${Width} mx-4 bg-[var(--surface)] border-2 border-[var(--border)] rounded-xl shadow-2xl outline-none`}
          >
            <ModalHeader title={title} titleId={titleId} onClose={onClose} card={card} eyebrow={card ? eyebrow : undefined} />

            <div className={card ? 'app-modal-body' : 'app-modal-body p-6'}>
              {children}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

const CLOSE_CLASS = 'p-1.5 rounded-md hover:bg-[var(--background)] transition-colors text-[var(--text-secondary)] hover:text-[var(--text-primary)]';

interface ModalHeaderProps {
  title?: string;
  titleId: string;
  onClose: () => void;
  card: boolean;
  eyebrow?: string;
}

/** Cabeçalho com título (nome do diálogo) ou só o botão de fechar no canto. */
function ModalHeader({ title, titleId, onClose, card, eyebrow }: ModalHeaderProps) {
  // Na variante card o estilo do botão vem de `.app-modal--card .app-modal-close`, sem utilitários concorrentes.
  const closeClass = card ? 'app-modal-close' : `app-modal-close ${CLOSE_CLASS}`;
  const close = (
    <button type="button" data-modal-close="" onClick={() => onClose()} className={title || card ? closeClass : `absolute top-3 right-3 ${closeClass}`} aria-label="Fechar modal">
      <X size={20} aria-hidden="true" />
    </button>
  );
  if (!title) return close;
  if (card) {
    return (
      <div className="app-modal-head">
        <div className="app-modal-heading">
          {eyebrow && <p className="app-modal-eyebrow">{eyebrow}</p>}
          <h2 id={titleId} className="app-modal-title">{title}</h2>
        </div>
        {close}
      </div>
    );
  }
  return (
    <div className="app-modal-head flex items-center justify-between px-6 py-4 border-b border-[var(--border)]">
      <h2 id={titleId} className="app-modal-title text-[var(--text-primary)] text-lg font-semibold">
        {title}
      </h2>
      {close}
    </div>
  );
}
