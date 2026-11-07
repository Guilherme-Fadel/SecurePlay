import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { BirthDateField } from '@/components/shared/BirthDateField';
import { PublicAccountShell, type AccountCharacter } from '@/components/shared/PublicAccountShell';
import { AccountInput, AccountSubmit, type AccountFeedback } from '@/components/shared/PublicAccountUi';
import { backendMessage } from '@/components/shared/publicAccountMessages';
import { startTrial } from '@/services/registration';
import { RegistrationContactFields } from '@/components/shared/RegistrationContactFields';
import { RegistrationLegalNotice } from '@/components/shared/RegistrationLegalNotice';

function trialCharacter(feedback: AccountFeedback | null): AccountCharacter {
  if (feedback?.tone === 'error') return { expression: 'startled', speech: 'Opa! Confira o aviso para continuar.' };
  return { expression: 'open', speech: 'Sete dias para explorar a trilha!' };
}

export default function TrialRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<AccountFeedback | null>(null);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFeedback(null);
    setSubmitting(true);
    try {
      await startTrial({ name, email, birth_date: birthDate, username: username.trim() || undefined, phone: phone.trim() || undefined });
      void navigate('/verifique-email?email=' + encodeURIComponent(email), { replace: true });
    } catch (error: unknown) {
      setFeedback({ tone: 'error', message: backendMessage(error, 'Não foi possível iniciar o teste.') });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PublicAccountShell
      titleId="trial-title"
      title={<>Experimente por <em>7 dias</em></>}
      lead="Explore a experiência de aluno gratuitamente. O prazo começa quando você confirma seu e-mail."
      character={trialCharacter(feedback)}
      feedback={feedback}
      wide
    >
      <form className="pas-form pas-form--grid" onSubmit={(event) => void submit(event)}>
        <AccountInput label="Seu nome" value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} required autoComplete="name" />
        <AccountInput label="Seu e-mail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" />
        <RegistrationContactFields username={username} phone={phone} setUsername={setUsername} setPhone={setPhone} disabled={submitting} />
        <BirthDateField value={birthDate} onChange={setBirthDate} />
        <AccountSubmit busy={submitting} busyLabel="Enviando confirmação...">Começar teste gratuito</AccountSubmit>
      </form>
      <RegistrationLegalNotice />
      <div className="pas-foot">
        <Link className="pas-link" to="/login">Já tenho uma conta</Link>
      </div>
    </PublicAccountShell>
  );
}
