import { useId, useState, type InputHTMLAttributes, type ReactNode, type Ref } from 'react';
import { ArrowRight, Check, Copy, Eye, EyeOff, Mail } from 'lucide-react';
import './public-account.css';

const ICON = { size: 20, strokeWidth: 2.4, 'aria-hidden': true } as const;

export type AccountFeedbackTone = 'error' | 'info' | 'success';

export interface AccountFeedback {
  tone: AccountFeedbackTone;
  title?: string;
  message: ReactNode;
}

function AlertGlyph() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" aria-hidden="true" focusable="false">
      <path d="M12 7.5v6" />
      <path d="M12 17h.01" />
    </svg>
  );
}

const TONE_ICON: Record<AccountFeedbackTone, ReactNode> = {
  error: <AlertGlyph />,
  info: <Mail {...ICON} />,
  success: <Check {...ICON} strokeWidth={2.8} />,
};

export function AccountMessage({ tone, title, message }: AccountFeedback) {
  return (
    <div className={`pas-msg pas-msg--${tone}`}>
      <span className="pas-msg-icon" aria-hidden="true">{TONE_ICON[tone]}</span>
      <div className="pas-msg-body">
        {title && <strong>{title}</strong>}
        <span>{message}</span>
      </div>
    </div>
  );
}

/** Regiões vivas sempre montadas, para o leitor de tela anunciar o que entra nelas. */
export function AccountFeedbackRegions({ feedback }: { feedback: AccountFeedback | null }) {
  const isError = feedback?.tone === 'error';
  return (
    <>
      <div className="pas-live" role="alert">{feedback && isError && <AccountMessage {...feedback} />}</div>
      <div className="pas-live" role="status">{feedback && !isError && <AccountMessage {...feedback} />}</div>
    </>
  );
}

function describedBy(id: string, invalid: boolean, withHint: boolean): string | undefined {
  const ids = [invalid ? `${id}-error` : '', withHint ? `${id}-hint` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

export interface AccountInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'className'> {
  label: string;
  optional?: boolean;
  hint?: ReactNode;
  /** Erro do próprio campo; liga aria-invalid e aria-describedby. */
  error?: string | null;
  inputRef?: Ref<HTMLInputElement>;
  /** Conteúdo após o input, dentro da mesma caixa (ex.: mostrar senha). */
  trailing?: ReactNode;
}

export function AccountInput({ label, optional = false, hint, error, inputRef, trailing, id: idProp, ...input }: AccountInputProps) {
  const autoId = useId();
  const id = idProp ?? autoId;
  const invalid = Boolean(error);
  return (
    <div className="pas-field">
      <label className="pas-label" htmlFor={id}>
        {label}
        {optional && <span className="pas-optional">opcional</span>}
      </label>
      <div className={invalid ? 'pas-box is-invalid' : 'pas-box'}>
        <input
          {...input}
          ref={inputRef}
          id={id}
          className="pas-input"
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy(id, invalid, Boolean(hint))}
        />
        {trailing}
      </div>
      {invalid && <p className="pas-field-error" id={`${id}-error`}>{error}</p>}
      {hint && <p className="pas-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

type AccountPasswordProps = Omit<AccountInputProps, 'type' | 'trailing'>;

export function AccountPasswordInput(props: AccountPasswordProps) {
  const [visible, setVisible] = useState(false);
  const toggle = (
    <button
      type="button"
      className="pas-eye"
      onClick={() => setVisible((current) => !current)}
      onMouseDown={(event) => event.preventDefault()}
      aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
    >
      {visible ? <EyeOff {...ICON} strokeWidth={2.2} /> : <Eye {...ICON} strokeWidth={2.2} />}
    </button>
  );
  return <AccountInput {...props} type={visible ? 'text' : 'password'} trailing={toggle} />;
}

interface AccountSubmitProps {
  busy: boolean;
  busyLabel: string;
  disabled?: boolean;
  type?: 'submit' | 'button';
  onClick?: () => void;
  children: ReactNode;
}

export function AccountSubmit({ busy, busyLabel, disabled = false, type = 'submit', onClick, children }: AccountSubmitProps) {
  return (
    <button type={type} className="pas-submit" disabled={busy || disabled} aria-busy={busy} onClick={onClick}>
      {busy && <span className="pas-spinner" aria-hidden="true" />}
      {busy ? busyLabel : children}
      {!busy && <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
    </button>
  );
}

/** Indicador visual de espera; o texto da espera fica no título ou em `children`. */
export function AccountLoading({ children }: { children?: ReactNode }) {
  return (
    <div className="pas-loading">
      <span className="pas-spinner" aria-hidden="true" />
      {children && <span>{children}</span>}
    </div>
  );
}

/** Identificador gerado pelo backend, com o botão de copiar. */
export function AccountCode({ value, copyLabel, onCopy }: { value: string; copyLabel: string; onCopy: () => void }) {
  return (
    <div className="pas-code">
      <strong className="pas-code-value">{value}</strong>
      <button type="button" className="pas-secondary" onClick={onCopy}>
        <Copy size={18} strokeWidth={2.4} aria-hidden="true" />
        {copyLabel}
      </button>
    </div>
  );
}
