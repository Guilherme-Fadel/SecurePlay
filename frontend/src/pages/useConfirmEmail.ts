import { useEffect, useRef, useState, type FormEvent } from 'react';
import { confirmEmail, setPassword as setRegistrationPassword } from '@/services/registration';
import { passwordValidationMessage } from '@/lib/password-policy';
import { backendCode, backendMessage, readHashToken } from '@/components/shared/publicAccountMessages';

const LINK_UNAVAILABLE = 'O link expirou, já foi usado ou não está disponível. Peça outro link.';

export type PasswordFieldError = { field: 'password' | 'repeat'; message: string } | null;

/** Confirmação do link de e-mail e, depois dela, a definição da senha inicial. */
export function useConfirmEmail() {
  const [token] = useState(readHashToken);
  const confirmationStarted = useRef(false);
  const [hasConfirmationLink] = useState(Boolean(token));
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [confirming, setConfirming] = useState(Boolean(token));
  const [passwordSetupToken, setPasswordSetupToken] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [fieldError, setFieldError] = useState<PasswordFieldError>(null);
  const [usernameConflict, setUsernameConflict] = useState(false);
  const [alternativeUsername, setAlternativeUsername] = useState('');

  useEffect(() => {
    if (!token || confirmationStarted.current) return;
    confirmationStarted.current = true;
    void confirmEmail(token).then((nextToken) => {
      window.history.replaceState(null, '', '/confirmar-email');
      setPasswordSetupToken(nextToken);
    }).catch((failure: unknown) => {
      const conflict = backendCode(failure) === 'USERNAME_TAKEN';
      setUsernameConflict(conflict);
      setError(conflict ? 'O usuário escolhido foi ocupado. Escolha outro para concluir seu cadastro.' : LINK_UNAVAILABLE);
    }).finally(() => setConfirming(false));
  }, [token]);

  const retryConfirmation = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      const nextToken = await confirmEmail(token, alternativeUsername.trim());
      window.history.replaceState(null, '', '/confirmar-email');
      setUsernameConflict(false); setError(''); setPasswordSetupToken(nextToken);
    } catch (failure: unknown) {
      setError(backendMessage(failure, 'Não foi possível confirmar. Tente novamente.'));
    } finally { setSubmitting(false); }
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const validation = passwordValidationMessage(password);
    if (validation) return setFieldError({ field: 'password', message: validation });
    if (password !== repeatPassword) return setFieldError({ field: 'repeat', message: 'As senhas não coincidem.' });
    setSubmitting(true);
    setFieldError(null);
    setError('');
    try {
      if (!passwordSetupToken) return;
      await setRegistrationPassword(passwordSetupToken, password);
      setSuccess(true);
    } catch {
      setError(LINK_UNAVAILABLE);
    } finally {
      setSubmitting(false);
    }
  };

  return {
    hasConfirmationLink, confirming, usernameConflict, passwordSetupToken, success, submitting, error, fieldError,
    password, repeatPassword, alternativeUsername, setAlternativeUsername, retryConfirmation, submit,
    setPassword: (value: string) => { setPassword(value); setFieldError(null); },
    setRepeatPassword: (value: string) => { setRepeatPassword(value); setFieldError(null); },
  };
}

export type ConfirmEmailState = ReturnType<typeof useConfirmEmail>;

export type ConfirmEmailView = 'success' | 'no-link' | 'confirming' | 'conflict' | 'unavailable' | 'password';

export function confirmEmailView(state: ConfirmEmailState): ConfirmEmailView {
  if (state.success) return 'success';
  if (!state.hasConfirmationLink) return 'no-link';
  if (state.confirming) return 'confirming';
  if (state.usernameConflict) return 'conflict';
  if (!state.passwordSetupToken) return 'unavailable';
  return 'password';
}
