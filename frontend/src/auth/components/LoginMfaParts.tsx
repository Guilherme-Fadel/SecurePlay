import { Fragment, useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react';
import { ArrowRight, Check, Copy, Lock, ShieldCheck, TriangleAlert } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useCopy, type LoginMfaState, type MfaPhase } from './useLoginMfa';

const ICON = { size: 20, strokeWidth: 2.2, 'aria-hidden': true } as const;
const COPY_FAILED = 'Não foi possível copiar. Selecione o texto e copie manualmente.';

function CopyButton({ label, text }: { label: string; text: string }) {
  const { status, copy } = useCopy();
  return (
    <>
      <button type="button" className="lgc-mfa-ghost" onClick={() => void copy(text)}>
        {status === 'copied' ? <Check size={18} strokeWidth={2.6} aria-hidden="true" /> : <Copy size={18} strokeWidth={2.4} aria-hidden="true" />}
        {label}
      </button>
      <span className="lgc-mfa-copy-status" role="status">
        {status === 'copied' && 'Copiado!'}
        {status === 'failed' && COPY_FAILED}
      </span>
    </>
  );
}

/** Passo 2 do cadastro: a chave em blocos de 4 caracteres e o atalho para o app. */
function SetupKey({ state, onRetry }: { state: LoginMfaState['setup']; onRetry: () => void }) {
  if (state.status === 'loading') {
    return (
      <p className="lgc-mfa-wait" role="status">
        <span className="lgc-spinner lgc-mfa-spinner" aria-hidden="true" />
        Gerando sua chave…
      </p>
    );
  }
  if (state.status === 'expired') {
    return <p className="lgc-mfa-wait">A chave aparece de novo assim que você digitar sua senha, logo abaixo.</p>;
  }
  if (state.status === 'error') {
    return (
      <div className="lgc-mfa-retry">
        <p className="lgc-field-error" role="alert">{state.message}</p>
        <button type="button" className="lgc-mfa-ghost" onClick={onRetry}>Tentar de novo</button>
      </div>
    );
  }
  return (
    <div className="lgc-mfa-keybox">
      <div className="lgc-mfa-qr">
        <QRCodeSVG value={state.otpauthUrl} size={176} level="M" marginSize={2} title="QR code da chave do SecurePlay" />
      </div>
      <span className="lgc-mfa-keyhint">Sem câmera? Digite a chave abaixo:</span>
      <code className="lgc-mfa-key">
        {state.groups.map((group, index) => (
          <Fragment key={`${index}-${group}`}>
            {index > 0 && ' '}
            <span>{group}</span>
          </Fragment>
        ))}
      </code>
      <div className="lgc-mfa-keyactions">
        <CopyButton label="Copiar chave" text={state.secret} />
      </div>
      <a className="lgc-link" href={state.otpauthUrl}>Abrir no app autenticador</a>
    </div>
  );
}

interface SetupPanelProps {
  setup: LoginMfaState['setup'];
  onRetry: () => void;
  children: ReactNode;
}

/** Cadastro guiado: três passos curtos; o terceiro é o formulário do código. */
export function MfaSetupSteps({ setup, onRetry, children }: SetupPanelProps) {
  return (
    <ol className="lgc-mfa-steps">
      <li>
        <strong>Abra o app autenticador</strong>
        <span>No celular, escolha adicionar uma conta nova. Se já adicionou o SecurePlay antes, apague a entrada antiga: a chave muda a cada cadastro.</span>
      </li>
      <li>
        <strong>Escaneie o QR code no app</strong>
        <SetupKey state={setup} onRetry={onRetry} />
      </li>
      <li>
        <strong>Confirme com o código do app</strong>
        {children}
      </li>
    </ol>
  );
}

interface CodeFormProps {
  phase: Exclude<MfaPhase, 'codes'>;
  entry: LoginMfaState['entry'];
  busy: boolean;
  blocked: boolean;
  onSwitch: (next: MfaPhase) => void;
}

const FIELD_COPY = {
  code: {
    label: 'Código de 6 números', placeholder: '000000', hint: 'O app troca o código a cada 30 segundos.',
    name: 'code', inputMode: 'numeric', autoComplete: 'one-time-code', autoCapitalize: 'none', maxLength: 6,
  },
  recovery: {
    label: 'Código de recuperação', placeholder: 'ABCD-EFGH', hint: 'Cada código de recuperação vale uma vez.',
    name: 'recoveryCode', inputMode: 'text', autoComplete: 'off', autoCapitalize: 'characters', maxLength: 20,
  },
} as const;

interface CodeInputProps {
  kind: keyof typeof FIELD_COPY;
  entry: LoginMfaState['entry'];
  busy: boolean;
}

function MfaCodeInput({ kind, entry, busy }: CodeInputProps) {
  const { label, placeholder, hint, ...attributes } = FIELD_COPY[kind];
  const { error, value, inputRef } = entry;
  const describedBy = [error ? 'mfa-input-error' : '', 'mfa-input-hint'].filter(Boolean).join(' ');
  return (
    <div className="lgc-field">
      <label className="lgc-label" htmlFor="mfa-input">{label}</label>
      <div className={error ? 'lgc-box is-invalid' : 'lgc-box'}>
        <ShieldCheck {...ICON} />
        <input
          key={kind}
          ref={inputRef}
          id="mfa-input"
          className="lgc-input lgc-mfa-input"
          type="text"
          spellCheck={false}
          placeholder={placeholder}
          value={value}
          disabled={busy}
          aria-invalid={error !== null}
          aria-describedby={describedBy}
          onChange={(event) => entry.change(event.target.value)}
          {...attributes}
        />
      </div>
      {error && <p className="lgc-field-error" id="mfa-input-error" role="alert">{error.message}</p>}
      <p className="lgc-hint" id="mfa-input-hint">{hint}</p>
    </div>
  );
}

/** Campo do código (do app ou de recuperação) com o botão de confirmar. */
export function MfaCodeForm({ phase, entry, busy, blocked, onSwitch }: CodeFormProps) {
  const recovery = phase === 'recovery';
  return (
    <form className="lgc-form" method="post" noValidate onSubmit={(event) => void entry.submit(event)}>
      <MfaCodeInput kind={recovery ? 'recovery' : 'code'} entry={entry} busy={busy} />
      <button type="submit" className="lgc-submit" disabled={busy || blocked} aria-busy={busy}>
        {busy && <span className="lgc-spinner" aria-hidden="true" />}
        {busy ? 'Confirmando…' : 'Confirmar'}
        {!busy && <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
      </button>
      {phase !== 'setup' && (
        <button type="button" className="lgc-link lgc-mfa-switch" disabled={busy} onClick={() => onSwitch(recovery ? 'code' : 'recovery')}>
          {recovery ? 'Usar o código do app autenticador' : 'Usar um código de recuperação'}
        </button>
      )}
    </form>
  );
}

const REAUTH_MESSAGE = 'Sua verificação expirou. Digite sua senha de novo para continuar.';

/** Desafio expirado: pede só a senha, sem sair da etapa. A senha vive apenas neste campo. */
export function MfaReauthForm({ reauth }: { reauth: LoginMfaState['reauth'] }) {
  const [password, setPassword] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { error, submitting } = reauth;
  const describedBy = error ? 'mfa-reauth-message mfa-reauth-error' : 'mfa-reauth-message';

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void reauth.submit(password).then(() => setPassword(''));
  };

  return (
    <form className="lgc-form" method="post" noValidate onSubmit={handleSubmit}>
      <p className="lgc-mfa-reauth-message" id="mfa-reauth-message" role="alert">{REAUTH_MESSAGE}</p>
      <div className="lgc-field">
        <label className="lgc-label" htmlFor="mfa-reauth-password">Senha</label>
        <div className={error ? 'lgc-box is-invalid' : 'lgc-box'}>
          <Lock {...ICON} />
          <input
            ref={inputRef}
            id="mfa-reauth-password"
            className="lgc-input"
            type="password"
            name="password"
            autoComplete="current-password"
            value={password}
            disabled={submitting}
            aria-invalid={error !== null}
            aria-describedby={describedBy}
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>
        {error && <p className="lgc-field-error" id="mfa-reauth-error" role="alert">{error}</p>}
      </div>
      <button type="submit" className="lgc-submit" disabled={submitting} aria-busy={submitting}>
        {submitting && <span className="lgc-spinner" aria-hidden="true" />}
        {submitting ? 'Continuando…' : 'Continuar'}
        {!submitting && <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
      </button>
    </form>
  );
}

interface RecoveryCodesProps {
  codes: string[];
  busy: boolean;
  onSaved: () => void;
}

/** Mostrado uma única vez, logo depois de ativar: o servidor não devolve estes códigos de novo. */
export function MfaRecoveryCodes({ codes, busy, onSaved }: RecoveryCodesProps) {
  return (
    <div className="lgc-form">
      <div className="lgc-msg lgc-msg--help" role="note">
        <span className="lgc-msg-icon" aria-hidden="true"><TriangleAlert {...ICON} /></span>
        <div className="lgc-msg-body">
          <strong>Guarde agora</strong>
          <span>Cada código vale uma vez e não será mostrado de novo.</span>
        </div>
      </div>
      <ul className="lgc-mfa-codes" aria-label="Códigos de recuperação">
        {codes.map((code) => <li key={code}><code>{code}</code></li>)}
      </ul>
      <div className="lgc-mfa-keyactions">
        <CopyButton label="Copiar códigos" text={codes.join('\n')} />
      </div>
      <button type="button" className="lgc-submit" disabled={busy} aria-busy={busy} onClick={onSaved}>
        {busy && <span className="lgc-spinner" aria-hidden="true" />}
        {busy ? 'Entrando…' : 'Guardei meus códigos'}
        {!busy && <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
      </button>
    </div>
  );
}
