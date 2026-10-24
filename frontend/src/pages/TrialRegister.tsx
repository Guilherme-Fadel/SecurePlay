import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast, Toaster } from 'sonner';
import { BirthDateField } from '@/components/shared/BirthDateField';
import { PageTransition } from '@/components/shared/PageTransition';
import { startTrial } from '@/services/registration';
import { RegistrationContactFields } from '@/components/shared/RegistrationContactFields';
import { RegistrationLegalNotice } from '@/components/shared/RegistrationLegalNotice';
import './invite-register.css';

export default function TrialRegister() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [phone, setPhone] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitting(true);
    try {
      await startTrial({ name, email, birth_date: birthDate, username: username.trim() || undefined, phone: phone.trim() || undefined });
      navigate('/verifique-email?email=' + encodeURIComponent(email), { replace: true });
    } catch (error: any) {
      toast.error(error.response?.data?.message ?? 'Não foi possível iniciar o teste.');
    } finally {
      setSubmitting(false);
    }
  };

  return <PageTransition><div className="invite-page"><main className="invite-card invite-card--registration">
    <div className="invite-brand">secure<em>play</em></div>
    <h1>Experimente por 7 dias</h1>
    <p className="invite-intro">Explore a experiência de aluno gratuitamente. O prazo começa quando você confirma seu e-mail.</p>
    <form className="invite-form invite-form--registration" onSubmit={submit}>
      <label>Seu nome<input value={name} onChange={(event) => setName(event.target.value)} minLength={3} maxLength={100} required autoComplete="name" /></label>
      <label>Seu e-mail<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required autoComplete="email" /></label>
      <RegistrationContactFields username={username} phone={phone} setUsername={setUsername} setPhone={setPhone} disabled={submitting} />
      <BirthDateField value={birthDate} onChange={setBirthDate} />
      <button type="submit" disabled={submitting}>{submitting ? 'Enviando confirmação...' : 'Começar teste gratuito'}</button>
    </form>
    <RegistrationLegalNotice />
    <p className="invite-legal-note"><Link to="/login">Já tenho uma conta</Link></p>
  </main><Toaster position="top-right" richColors /></div></PageTransition>;
}
