import type { FocusEvent, ReactNode, RefObject } from 'react';
import { Eye, EyeOff, LockKeyhole, Mail } from 'lucide-react';
import type { LoginFocus } from './useLoginClassroom';

const ICON = { size: 20, strokeWidth: 2.2, 'aria-hidden': true } as const;

/** Mantém o foco "dentro" do campo enquanto ele passa do input para o botão de mostrar senha. */
function focusHandlers(field: Exclude<LoginFocus, 'none'>, onFocusChange: (focus: LoginFocus) => void) {
  return {
    onFocus: () => onFocusChange(field),
    onBlur: (event: FocusEvent<HTMLDivElement>) => {
      const next = event.relatedTarget;
      if (!(next instanceof Node) || !event.currentTarget.contains(next)) onFocusChange('none');
    },
  };
}

interface FieldShellProps {
  id: string;
  field: Exclude<LoginFocus, 'none'>;
  label: string;
  invalid: boolean;
  focus: LoginFocus;
  error: string;
  hint?: string;
  onFocusChange: (focus: LoginFocus) => void;
  children: ReactNode;
}

function FieldShell({ id, field, label, invalid, focus, error, hint, onFocusChange, children }: FieldShellProps) {
  const boxClass = ['lgc-box', invalid ? 'is-invalid' : '', focus === field ? 'is-focused' : ''].filter(Boolean).join(' ');
  return (
    <div className="lgc-field">
      <label className="lgc-label" htmlFor={id}>{label}</label>
      <div className={boxClass} {...focusHandlers(field, onFocusChange)}>{children}</div>
      {invalid && <p className="lgc-field-error" id={`${id}-error`}>{error}</p>}
      {hint && <p className="lgc-hint" id={`${id}-hint`}>{hint}</p>}
    </div>
  );
}

function describedBy(id: string, invalid: boolean, withHint: boolean): string | undefined {
  const ids = [invalid ? `${id}-error` : '', withHint ? `${id}-hint` : ''].filter(Boolean);
  return ids.length ? ids.join(' ') : undefined;
}

interface IdentifierFieldProps {
  value: string;
  invalid: boolean;
  focus: LoginFocus;
  inputRef: RefObject<HTMLInputElement>;
  onChange: (value: string) => void;
  onFocusChange: (focus: LoginFocus) => void;
}

export function IdentifierField({ value, invalid, focus, inputRef, onChange, onFocusChange }: IdentifierFieldProps) {
  const id = 'login-identifier';
  return (
    <FieldShell
      id={id}
      field="identifier"
      label="Usuário ou e-mail"
      invalid={invalid}
      focus={focus}
      error="Digite seu usuário ou e-mail."
      hint="Códigos da escola já emitidos também continuam válidos."
      onFocusChange={onFocusChange}
    >
      <Mail {...ICON} />
      <input
        ref={inputRef}
        id={id}
        className="lgc-input"
        type="text"
        name="identifier"
        autoComplete="username"
        autoCapitalize="none"
        spellCheck={false}
        placeholder="Seu usuário ou voce@escola.com"
        value={value}
        aria-invalid={invalid}
        aria-describedby={describedBy(id, invalid, true)}
        onChange={(event) => onChange(event.target.value)}
      />
    </FieldShell>
  );
}

interface PasswordFieldProps extends IdentifierFieldProps {
  visible: boolean;
  onToggleVisible: () => void;
}

export function PasswordField({ value, invalid, focus, visible, inputRef, onChange, onFocusChange, onToggleVisible }: PasswordFieldProps) {
  const id = 'login-password';
  return (
    <FieldShell id={id} field="password" label="Senha" invalid={invalid} focus={focus} error="Digite sua senha." onFocusChange={onFocusChange}>
      <LockKeyhole {...ICON} />
      <input
        ref={inputRef}
        id={id}
        className="lgc-input"
        type={visible ? 'text' : 'password'}
        name="password"
        autoComplete="current-password"
        placeholder="Digite sua senha"
        value={value}
        aria-invalid={invalid}
        aria-describedby={describedBy(id, invalid, false)}
        onChange={(event) => onChange(event.target.value)}
      />
      <button
        type="button"
        className="lgc-eye"
        onClick={onToggleVisible}
        onMouseDown={(event) => event.preventDefault()}
        aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
      >
        {visible ? <EyeOff {...ICON} /> : <Eye {...ICON} />}
      </button>
    </FieldShell>
  );
}
