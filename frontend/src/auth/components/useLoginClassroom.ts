import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { initialAuthenticatedPath } from '@/components/admin/console/consoleNavigation';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { loginService } from '@/services/login/login';
import type { LoginFailureReason, LoginOutcome } from '@/services/login/types';

export type LoginFocus = 'none' | 'identifier' | 'password';
export type LoginNoticeKind = 'email_verification' | 'password_setup';

/** O que a tela mostra depois do envio; as mensagens vêm do serviço. */
export type LoginFeedback =
  | { kind: 'error'; reason: LoginFailureReason; message: string }
  | { kind: LoginNoticeKind; email: string; message: string }
  | { kind: 'success'; message: string };

export interface LoginFieldErrors {
  identifier: boolean;
  password: boolean;
}

type SuccessOutcome = Extract<LoginOutcome, { status: 'success' }>;

const NO_FIELD_ERRORS: LoginFieldErrors = { identifier: false, password: false };
/** Tempo para o personagem comemorar antes de trocar de página. */
const SUCCESS_HOLD_MS = 600;
/** Só aparece se o serviço lançar em vez de devolver um LoginOutcome. */
const UNEXPECTED_FAILURE = 'Não foi possível entrar agora. Tente novamente em instantes.';

/** Mesma rota e parâmetros que o login já usava para confirmar e-mail ou definir senha. */
export function verificationPath(kind: LoginNoticeKind, email: string): string {
  const base = `/verifique-email?email=${encodeURIComponent(email)}`;
  return kind === 'password_setup' ? `${base}&mode=password` : base;
}

function rememberName(nome: string | undefined) {
  try {
    localStorage.setItem('nome', nome ?? '');
  } catch {
    // Sem armazenamento local (modo privado): a sessão segue válida.
  }
}

/** Valores dos campos, foco, visibilidade da senha e erros de preenchimento. */
function useLoginFields() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [focus, setFocus] = useState<LoginFocus>('none');
  const [fieldErrors, setFieldErrors] = useState<LoginFieldErrors>(NO_FIELD_ERRORS);
  const identifierRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [pendingFocus, setPendingFocus] = useState<{ field: 'identifier' | 'password' } | null>(null);

  // O foco vai para o campo depois da renderização, quando aria-invalid e a mensagem
  // de erro já estão no DOM; se o campo já tinha o foco, ele é refeito para o leitor
  // de tela anunciar o erro de novo.
  useEffect(() => {
    if (!pendingFocus) return;
    const input = (pendingFocus.field === 'identifier' ? identifierRef : passwordRef).current;
    if (input && document.activeElement === input) input.blur();
    input?.focus();
  }, [pendingFocus]);

  const changeIdentifier = useCallback((value: string) => {
    setIdentifier(value);
    setFieldErrors((current) => (current.identifier ? { ...current, identifier: false } : current));
  }, []);

  const changePassword = useCallback((value: string) => {
    setPassword(value);
    setFieldErrors((current) => (current.password ? { ...current, password: false } : current));
  }, []);

  const togglePassword = useCallback(() => setShowPassword((current) => !current), []);

  return {
    identifier, password, showPassword, focus, fieldErrors, identifierRef, passwordRef,
    setPassword, setFocus, setFieldErrors, setPendingFocus, changeIdentifier, changePassword, togglePassword,
  };
}

type LoginFields = ReturnType<typeof useLoginFields>;

/** Envio, resposta do serviço e transição para a área logada. */
function useLoginSubmit(fields: LoginFields, onReaction: () => void) {
  const [feedback, setFeedback] = useState<LoginFeedback | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const successTimer = useRef<number | undefined>(undefined);
  const { setSession } = useCurrentUser();
  const navigate = useNavigate();
  const { identifier, password, setPassword, setFieldErrors, setPendingFocus } = fields;
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
      window.clearTimeout(successTimer.current);
    };
  }, []);

  const showError = useCallback((reason: LoginFailureReason, message: string) => {
    setPassword('');
    setFeedback({ kind: 'error', reason, message });
    onReaction();
    const identifierMissing = reason === 'missing_fields' && !identifier.trim();
    setPendingFocus({ field: identifierMissing ? 'identifier' : 'password' });
  }, [identifier, setPassword, setPendingFocus, onReaction]);

  const finishSuccess = useCallback((outcome: SuccessOutcome) => {
    rememberName(outcome.nome);
    // Se a pessoa saiu da tela durante o envio, a sessão é registrada sem tirá-la de onde está.
    if (!mounted.current) {
      setSession(outcome.user);
      return;
    }
    setFeedback({ kind: 'success', message: outcome.message });
    successTimer.current = window.setTimeout(() => {
      setSession(outcome.user);
      void navigate(initialAuthenticatedPath(outcome.user), { replace: true });
    }, SUCCESS_HOLD_MS);
  }, [navigate, setSession]);

  const applyOutcome = useCallback((outcome: LoginOutcome) => {
    if (outcome.status === 'success') {
      finishSuccess(outcome);
    } else if (outcome.status === 'error') {
      showError(outcome.reason, outcome.message);
    } else {
      setPassword('');
      setFeedback({ kind: outcome.status, email: outcome.email || identifier.trim(), message: outcome.message });
    }
  }, [finishSuccess, showError, identifier, setPassword]);

  const validate = useCallback(() => {
    const errors = { identifier: !identifier.trim(), password: !password };
    setFieldErrors(errors);
    if (errors.identifier) setPendingFocus({ field: 'identifier' });
    else if (errors.password) setPendingFocus({ field: 'password' });
    return !errors.identifier && !errors.password;
  }, [identifier, password, setFieldErrors, setPendingFocus]);

  const handleSubmit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current || feedback?.kind === 'success') return;
    setFeedback(null);
    if (!validate()) return;
    inFlight.current = true;
    setSubmitting(true);
    try {
      applyOutcome(await loginService(identifier, password));
    } catch {
      showError('server', UNEXPECTED_FAILURE);
    } finally {
      inFlight.current = false;
      setSubmitting(false);
    }
  }, [applyOutcome, showError, validate, feedback, identifier, password]);

  return { feedback, submitting, handleSubmit };
}

/** Estado completo da tela de login "Sala da turma". */
export function useLoginClassroom() {
  const fields = useLoginFields();
  const [startled, setStartled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const startle = useCallback(() => setStartled(true), []);
  const submit = useLoginSubmit(fields, startle);
  const { changeIdentifier, changePassword } = fields;

  const onIdentifierChange = useCallback((value: string) => {
    setStartled(false);
    changeIdentifier(value);
  }, [changeIdentifier]);

  const onPasswordChange = useCallback((value: string) => {
    setStartled(false);
    changePassword(value);
  }, [changePassword]);

  const toggleHelp = useCallback(() => setHelpOpen((current) => !current), []);

  return {
    ...fields,
    ...submit,
    startled,
    helpOpen,
    toggleHelp,
    onIdentifierChange,
    onPasswordChange,
  };
}

export type LoginClassroomState = ReturnType<typeof useLoginClassroom>;
