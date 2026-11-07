import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { PublicAccountShell, type AccountCharacter } from '@/components/shared/PublicAccountShell';
import { AccountCode, AccountPasswordInput, AccountSubmit, type AccountFeedback } from '@/components/shared/PublicAccountUi';
import { backendMessage, readHashToken } from '@/components/shared/publicAccountMessages';
import { resetStudentPassword } from '@/services/registration';

const MISMATCH = 'As senhas não conferem.';

function useStudentPasswordReset() {
  const [token] = useState(readHashToken);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [mismatch, setMismatch] = useState(false);
  const [loginCode, setLoginCode] = useState<string | null>(null);
  const [username, setUsername] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AccountFeedback | null>(null);
  const identifier = email || username || loginCode;

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (password !== confirmation) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    setFeedback(null);
    setSubmitting(true);
    try {
      const result = await resetStudentPassword(token, password);
      setLoginCode(result.login_code);
      setUsername(result.username ?? null);
      setEmail(result.email ?? null);
      window.history.replaceState(null, '', window.location.pathname);
      setFeedback({ tone: 'success', title: 'Tudo certo!', message: result.mensagem });
    } catch (error: unknown) {
      setFeedback({ tone: 'error', message: backendMessage(error, 'Não foi possível redefinir o acesso.') });
    } finally { setSubmitting(false); }
  };

  const copy = () => {
    void navigator.clipboard.writeText(identifier ?? '')
      .then(() => setFeedback({ tone: 'success', message: 'Identificador copiado.' }))
      .catch(() => undefined);
  };

  return {
    validToken: /^[A-Za-z0-9_-]{43}$/.test(token),
    password, confirmation, mismatch, username, email, identifier, submitting, feedback, submit, copy,
    setPassword: (value: string) => { setPassword(value); setMismatch(false); },
    setConfirmation: (value: string) => { setConfirmation(value); setMismatch(false); },
  };
}

type ResetState = ReturnType<typeof useStudentPasswordReset>;

function resetCharacter(state: ResetState): AccountCharacter {
  if (state.identifier) return { expression: 'happy', speech: 'Senha nova, aventura nova!' };
  if (!state.validToken) return { expression: 'sleepy', speech: 'Esse link já não funciona.' };
  if (state.feedback?.tone === 'error') return { expression: 'startled', speech: 'Opa! Confira o aviso para continuar.' };
  return { expression: 'closed', speech: 'Pode digitar. Não estou olhando sua senha.' };
}

function ResetForm({ state }: { state: ResetState }) {
  return (
    <form onSubmit={(event) => void state.submit(event)} className="pas-form">
      <AccountPasswordInput label="Nova senha" autoComplete="new-password" minLength={6} maxLength={72} required value={state.password} onChange={(event) => state.setPassword(event.target.value)} />
      <AccountPasswordInput
        label="Confirme a nova senha"
        autoComplete="new-password"
        minLength={6}
        maxLength={72}
        required
        value={state.confirmation}
        error={state.mismatch ? MISMATCH : null}
        onChange={(event) => state.setConfirmation(event.target.value)}
      />
      <AccountSubmit busy={state.submitting} busyLabel="Atualizando...">Salvar nova senha</AccountSubmit>
    </form>
  );
}

export default function StudentPasswordReset() {
  const state = useStudentPasswordReset();
  const common = { titleId: 'student-reset-title', character: resetCharacter(state), feedback: state.feedback };

  if (state.identifier) {
    return (
      <PublicAccountShell {...common} title={<>Acesso <em>atualizado</em></>} lead={state.email ? 'Agora é só entrar com seu e-mail e a nova senha.' : `Use ${state.username ? 'seu usuário' : 'seu código de acesso'} com a nova senha.`}>
        <AccountCode value={state.identifier} copyLabel={`Copiar ${state.email ? 'e-mail' : state.username ? 'usuário' : 'código'}`} onCopy={state.copy} />
        <Link className="pas-cta" to="/login">Ir para o login</Link>
      </PublicAccountShell>
    );
  }
  if (!state.validToken) {
    return (
      <PublicAccountShell {...common} title={<>Link <em>indisponível</em></>} lead="Peça um novo link em “Esqueci minha senha”, na tela de entrada, ou fale com a administração da escola.">
        <Link className="pas-cta" to="/login">Ir para o login</Link>
      </PublicAccountShell>
    );
  }
  return (
    <PublicAccountShell {...common} title={<>Defina uma <em>nova senha</em></>} lead="Depois de salvar, entre com seu e-mail, usuário ou código de acesso e a nova senha.">
      <ResetForm state={state} />
    </PublicAccountShell>
  );
}
