import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { getMe } from '@/services/me';
import { LOGIN_ERROR_MESSAGES } from '@/services/login/loginErrors';
import { loginService } from '@/services/login/login';
import { groupSecret, mfaFailureAction, startMfaSetup, verifyMfa, type MfaFailure, type MfaVerifyInput } from '@/services/login/mfa';
import type { LoginFailureReason, LoginOutcome } from '@/services/login/types';

/** O que a tela de login sabe quando o servidor pede a segunda etapa. */
export interface MfaStage {
  /** Identificador já digitado no login, para pedir só a senha se o desafio expirar. */
  identifier: string;
  setupRequired: boolean;
  message: string;
}

/** `setup`: primeira vez (chave + código); `code`/`recovery`: conta já protegida; `codes`: códigos guardados. */
export type MfaPhase = 'setup' | 'code' | 'recovery' | 'codes';

type SuccessOutcome = Extract<LoginOutcome, { status: 'success' }>;

const CODE_LENGTH = 6;
const COPY_RESET_MS = 3000;
const EMPTY_CODE_MESSAGE = 'Digite os 6 números que aparecem no app autenticador.';
const EMPTY_RECOVERY_MESSAGE = 'Digite um dos seus códigos de recuperação.';

/** Ponte com a tela de login: transforma o fim da etapa em sucesso ou volta ao formulário. */
export function useMfaActions(
  setMfa: (stage: MfaStage | null) => void,
  bridge: {
    finishSuccess: (outcome: SuccessOutcome) => void;
    showError: (reason: LoginFailureReason, message: string) => void;
    focusPassword: () => void;
  },
) {
  const { finishSuccess, showError, focusPassword } = bridge;

  // Mesmo caminho do login normal: buscar o usuário e deixar o sucesso navegar.
  const completeMfa = useCallback(async (nome: string | undefined, message: string) => {
    try {
      finishSuccess({ status: 'success', user: await getMe(), nome, message });
    } catch {
      setMfa(null);
      showError('session', LOGIN_ERROR_MESSAGES.session);
    }
  }, [finishSuccess, setMfa, showError]);

  const leaveMfa = useCallback(() => {
    setMfa(null);
    focusPassword();
  }, [setMfa, focusPassword]);

  return { completeMfa, leaveMfa };
}

function useMounted() {
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  return mounted;
}

export type MfaSetupState =
  | { status: 'loading' }
  | { status: 'expired' }
  | { status: 'ready'; groups: string[]; secret: string; otpauthUrl: string }
  | { status: 'error'; message: string };

/** Pede a chave uma única vez por montagem (o StrictMode roda o efeito duas vezes). */
function useMfaSetup(enabled: boolean, onExpired: () => void, onAlreadyActive: () => void) {
  const [setup, setSetup] = useState<MfaSetupState>({ status: 'loading' });
  const mounted = useMounted();
  const started = useRef(false);

  const load = useCallback(async () => {
    setSetup({ status: 'loading' });
    const result = await startMfaSetup();
    if (!mounted.current) return;
    if (result.status === 'success') {
      setSetup({ status: 'ready', groups: groupSecret(result.secret), secret: result.secret, otpauthUrl: result.otpauthUrl });
    } else if (mfaFailureAction(result.reason) === 'reauth') {
      setSetup({ status: 'expired' });
      onExpired();
    } else if (result.alreadyActive) {
      onAlreadyActive();
    } else {
      setSetup({ status: 'error', message: result.message });
    }
  }, [mounted, onExpired, onAlreadyActive]);

  useEffect(() => {
    if (!enabled || started.current) return;
    started.current = true;
    void load();
  }, [enabled, load]);

  return { setup, retrySetup: load };
}

/** Valor digitado na entrada: só dígitos no código do app; recuperação em caixa alta. */
function sanitize(phase: MfaPhase, raw: string): string {
  if (phase === 'recovery') return raw.toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 20);
  return raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
}

function buildInput(phase: MfaPhase, value: string): MfaVerifyInput | null {
  if (phase === 'recovery') return value.replace(/-/g, '') ? { recoveryCode: value } : null;
  return value.length === CODE_LENGTH ? { code: value } : null;
}

interface EntryHandlers {
  onExpired: () => void;
  onVerified: (nome: string | undefined, message: string) => Promise<void>;
  onCodes: (codes: string[], nome: string | undefined, message: string) => void;
}

/** Campo de código, envio e erros da etapa (cadastro, código do app e recuperação). */
function useMfaEntry(phase: MfaPhase, { onExpired, onVerified, onCodes }: EntryHandlers) {
  const [value, setValue] = useState('');
  const [error, setError] = useState<MfaFailure | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [focusTick, setFocusTick] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  const mounted = useMounted();

  useEffect(() => {
    if (focusTick > 0) inputRef.current?.focus();
  }, [focusTick]);

  const refocus = useCallback(() => setFocusTick((tick) => tick + 1), []);

  const change = useCallback((raw: string) => {
    setValue(sanitize(phase, raw));
    setError(null);
  }, [phase]);

  const reset = useCallback(() => {
    setValue('');
    setError(null);
    refocus();
  }, [refocus]);

  const fail = useCallback((failure: MfaFailure) => {
    if (mfaFailureAction(failure.reason) === 'reauth') {
      onExpired();
      return;
    }
    if (failure.reason === 'code_invalid') setValue('');
    setError(failure);
    refocus();
  }, [onExpired, refocus]);

  const submit = useCallback(async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (inFlight.current) return;
    const input = buildInput(phase, value);
    if (!input) {
      fail({ reason: 'code_invalid', message: phase === 'recovery' ? EMPTY_RECOVERY_MESSAGE : EMPTY_CODE_MESSAGE });
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    const result = await verifyMfa(input);
    inFlight.current = false;
    if (!mounted.current) return;
    if (result.status === 'error') {
      setSubmitting(false);
      fail(result);
    } else if (result.recoveryCodes.length > 0) {
      setSubmitting(false);
      onCodes(result.recoveryCodes, result.nome, result.message);
    } else {
      await onVerified(result.nome, result.message);
      if (mounted.current) setSubmitting(false);
    }
  }, [phase, value, fail, mounted, onCodes, onVerified]);

  return { value, error, submitting, inputRef, change, reset, refocus, submit };
}

export type CopyStatus = 'idle' | 'copied' | 'failed';

/** Copia um texto e informa o resultado por alguns segundos, sem depender de permissões extras. */
export function useCopy() {
  const [status, setStatus] = useState<CopyStatus>('idle');
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const copy = useCallback(async (text: string) => {
    let next: CopyStatus = 'copied';
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      next = 'failed';
    }
    setStatus(next);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setStatus('idle'), COPY_RESET_MS);
  }, []);

  return { status, copy };
}

interface MfaHandlers {
  onVerified: EntryHandlers['onVerified'];
}

interface IssuedCodes {
  codes: string[];
  nome: string | undefined;
  message: string;
}

const REAUTH_UNEXPECTED = 'Não foi possível continuar agora. Volte ao login e entre de novo.';

/** Desafio expirado: pede só a senha (o identificador veio do login) e renova o desafio sem sair da etapa. */
function useMfaReauth(
  identifier: string,
  onVerified: EntryHandlers['onVerified'],
  onRenewed: (setupRequired: boolean) => void,
) {
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const inFlight = useRef(false);
  const mounted = useMounted();

  const submit = useCallback(async (password: string) => {
    if (inFlight.current) return;
    if (!password) {
      setError(LOGIN_ERROR_MESSAGES.missing_fields);
      return;
    }
    inFlight.current = true;
    setSubmitting(true);
    setError(null);
    let outcome: LoginOutcome | null = null;
    try {
      outcome = await loginService(identifier, password);
    } catch {
      outcome = null;
    }
    inFlight.current = false;
    if (!mounted.current) return;
    setSubmitting(false);
    if (outcome?.status === 'mfa') {
      onRenewed(outcome.setupRequired);
    } else if (outcome?.status === 'success') {
      await onVerified(outcome.nome, outcome.message);
    } else {
      setError(outcome ? outcome.message : REAUTH_UNEXPECTED);
    }
  }, [identifier, mounted, onRenewed, onVerified]);

  return { error, submitting, submit };
}

/** Estado completo da etapa de MFA: fase, chave de cadastro, campo e códigos de recuperação. */
export function useLoginMfa(stage: MfaStage, { onVerified }: MfaHandlers) {
  const [phase, setPhase] = useState<MfaPhase>(stage.setupRequired ? 'setup' : 'code');
  const [issued, setIssued] = useState<IssuedCodes | null>(null);
  const [finishing, setFinishing] = useState(false);
  const [expired, setExpired] = useState(false);
  const mounted = useMounted();
  const markExpired = useCallback(() => setExpired(true), []);

  const alreadyActive = useCallback(() => setPhase('code'), []);
  const onCodes = useCallback((codes: string[], nome: string | undefined, message: string) => {
    setIssued({ codes, nome, message });
    setPhase('codes');
  }, []);

  const { setup, retrySetup } = useMfaSetup(phase === 'setup', markExpired, alreadyActive);
  const entry = useMfaEntry(phase, { onExpired: markExpired, onVerified, onCodes });
  const { reset, refocus } = entry;

  const switchPhase = useCallback((next: MfaPhase) => {
    setPhase(next);
    reset();
  }, [reset]);

  // Só segue para a área logada depois que a pessoa confirma que guardou os códigos.
  const confirmSaved = useCallback(async () => {
    if (!issued) return;
    setFinishing(true);
    await onVerified(issued.nome, issued.message);
    if (mounted.current) setFinishing(false);
  }, [issued, onVerified, mounted]);

  // Desafio renovado: a chave pendente volta igual (o QR continua valendo) e o código digitado fica.
  const renewed = useCallback((setupRequired: boolean) => {
    setExpired(false);
    if (phase === 'setup' && !setupRequired) setPhase('code');
    else if (phase === 'setup') void retrySetup();
    refocus();
  }, [phase, retrySetup, refocus]);
  const reauth = useMfaReauth(stage.identifier, onVerified, renewed);

  return { phase, setup, retrySetup, entry, expired, reauth, codes: issued?.codes ?? [], finishing, switchPhase, confirmSaved };
}

export type LoginMfaState = ReturnType<typeof useLoginMfa>;
