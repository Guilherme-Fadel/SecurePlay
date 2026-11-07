import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/shared/BrandMark';
import { ForgotPasswordDialog } from './ForgotPasswordDialog';
import { LoginCrew } from './LoginCrew';
import { IdentifierField, PasswordField } from './LoginFields';
import { HELP_PANEL_ID, LoginFeedbackRegions, LoginHelpPanel } from './LoginNotices';
import { useLoginClassroom, type LoginClassroomState } from './useLoginClassroom';

import './login-classroom.css';

/** Formas de fundo do canvas "Sala da turma"; puramente decorativas. */
function LoginBackdrop() {
  return (
    <>
      <svg className="lgc-wave lgc-wave--top" viewBox="0 0 600 360" aria-hidden="true" focusable="false">
        <path fill="var(--sp-pink)" d="M120 0 H600 V320 C 520 360, 430 300, 380 230 C 330 160, 250 140, 180 100 C 130 70, 110 30, 120 0 Z" />
      </svg>
      <svg className="lgc-wave lgc-wave--left" viewBox="0 0 600 380" aria-hidden="true" focusable="false">
        <path fill="var(--sp-yellow)" d="M0 40 C 120 0, 240 60, 300 150 C 360 240, 450 300, 600 380 H0 Z" />
        <path fill="var(--sp-orange)" d="M0 200 C 90 170, 170 220, 210 280 C 240 330, 280 360, 330 380 H0 Z" />
      </svg>
      <svg className="lgc-wave lgc-wave--right" viewBox="0 0 420 300" aria-hidden="true" focusable="false">
        <path fill="var(--sp-blue)" d="M420 0 C 330 20, 270 100, 250 170 C 230 240, 190 280, 120 300 H420 Z" />
      </svg>
    </>
  );
}

function SubmitButton({ busy }: { busy: boolean }) {
  return (
    <button type="submit" className="lgc-submit" disabled={busy} aria-busy={busy}>
      {busy && <span className="lgc-spinner" aria-hidden="true" />}
      {busy ? 'Preparando…' : 'Entrar na aventura'}
      {!busy && <ArrowRight size={20} strokeWidth={2.6} aria-hidden="true" />}
    </button>
  );
}

function LoginForm({ state }: { state: LoginClassroomState }) {
  const [forgotOpen, setForgotOpen] = useState(false);
  const busy = state.submitting || state.feedback?.kind === 'success';
  return (
    <>
      <form className="lgc-form" method="post" noValidate onSubmit={(event) => void state.handleSubmit(event)}>
        <IdentifierField
          value={state.identifier}
          invalid={state.fieldErrors.identifier}
          focus={state.focus}
          inputRef={state.identifierRef}
          onChange={state.onIdentifierChange}
          onFocusChange={state.setFocus}
        />
        <PasswordField
          value={state.password}
          invalid={state.fieldErrors.password}
          focus={state.focus}
          visible={state.showPassword}
          inputRef={state.passwordRef}
          onChange={state.onPasswordChange}
          onFocusChange={state.setFocus}
          onToggleVisible={state.togglePassword}
        />
        <div className="lgc-row">
          <button type="button" className="lgc-link" aria-expanded={state.helpOpen} aria-controls={HELP_PANEL_ID} onClick={state.toggleHelp}>
            Preciso de ajuda
          </button>
          <button type="button" className="lgc-link" aria-haspopup="dialog" onClick={() => setForgotOpen(true)}>
            Esqueci minha senha
          </button>
        </div>
        <LoginHelpPanel open={state.helpOpen} />
        <SubmitButton busy={busy} />
      </form>
      {/* Fora do <form>: o diálogo tem o próprio formulário e formulários não se aninham. */}
      {forgotOpen && <ForgotPasswordDialog initialEmail={state.identifier} onClose={() => setForgotOpen(false)} />}
    </>
  );
}

export function LoginClassroom() {
  const state = useLoginClassroom();
  return (
    <div className="login-page lgc">
      <LoginBackdrop />
      <header className="lgc-top">
        <Link to="/" className="lgc-brand" aria-label="SecurePlay, ir para a página inicial">
          <BrandMark variant="horizontal" tone="auto" decorative />
        </Link>
      </header>
      <main className="lgc-stage">
        <section className="lgc-panel" aria-labelledby="login-title">
          <div className="lgc-form-col">
            <div className="lgc-heading">
              <h1 id="login-title" className="sp-display lgc-title">Que bom te ver <em>de novo!</em></h1>
              <p className="lgc-lead">Entre com os dados da sua escola ou organização para continuar.</p>
            </div>
            <LoginFeedbackRegions feedback={state.feedback} />
            <LoginForm state={state} />
            <div className="lgc-invite">
              <strong>Ainda não tem convite?</strong>
              <span>Peça ajuda a um responsável, educador ou administrador da sua turma.</span>
            </div>
          </div>
          <LoginCrew feedback={state.feedback} submitting={state.submitting} startled={state.startled} focus={state.focus} />
        </section>
      </main>
    </div>
  );
}
