import { Link } from 'react-router-dom';
import { BirthDateField } from '@/components/shared/BirthDateField';
import { PublicAccountShell, type AccountCharacter } from '@/components/shared/PublicAccountShell';
import { AccountCode, AccountInput, AccountLoading, AccountPasswordInput, AccountSubmit } from '@/components/shared/PublicAccountUi';
import { RegistrationContactFields } from '@/components/shared/RegistrationContactFields';
import { RegistrationLegalNotice } from '@/components/shared/RegistrationLegalNotice';
import type { ConvitePublico } from '@/services/convites';
import { useInviteRegister, type InviteRegisterState } from './useInviteRegister';

const TITLE_ID = 'invite-register-title';

function inviteCharacter(state: InviteRegisterState): AccountCharacter {
  if (state.loading) return { expression: 'curious', speech: 'Conferindo seu convite…' };
  if (!state.convite) return { expression: 'sleepy', speech: 'Esse convite já não funciona.' };
  if (state.createdUsername) return { expression: 'happy', speech: 'Conta criada! Bora para a trilha.' };
  if (state.feedback?.tone === 'error') return { expression: 'startled', speech: 'Opa! Confira o aviso para continuar.' };
  return { expression: 'open', speech: 'Que bom ter você na turma!' };
}

function SchoolStudentFields({ state }: { state: InviteRegisterState }) {
  const { form, setField, submitting, schoolWithoutEmail, mismatch } = state;
  return <>
    <AccountInput
      label="E-mail"
      optional
      type="email"
      value={form.email}
      onChange={(event) => setField('email')(event.target.value)}
      maxLength={100}
      autoComplete="email"
      hint="Sem e-mail, escolha um usuário e uma senha. Com e-mail, confirme o endereço para criar sua senha."
    />
    <RegistrationContactFields username={form.username} phone={form.phone} setUsername={setField('username')} setPhone={setField('phone')} usernameRequired={schoolWithoutEmail} disabled={submitting} />
    {schoolWithoutEmail && <>
      <AccountPasswordInput label="Crie uma senha" value={form.password} onChange={(event) => setField('password')(event.target.value)} minLength={6} maxLength={72} autoComplete="new-password" required />
      <AccountPasswordInput
        label="Confirme a senha"
        value={form.confirmPassword}
        onChange={(event) => setField('confirmPassword')(event.target.value)}
        minLength={6}
        maxLength={72}
        autoComplete="new-password"
        required
        error={mismatch ? 'As senhas não conferem.' : null}
      />
    </>}
  </>;
}

function LegacyEmailFields({ state, convite }: { state: InviteRegisterState; convite: ConvitePublico }) {
  const { form, setField, submitting } = state;
  return <>
    <AccountInput label="E-mail da escola" type="email" value={form.email} onChange={(event) => setField('email')(event.target.value)} disabled={Boolean(convite.email)} required />
    <RegistrationContactFields username={form.username} phone={form.phone} setUsername={setField('username')} setPhone={setField('phone')} disabled={submitting} />
    <BirthDateField value={form.birthDate} onChange={setField('birthDate')} />
  </>;
}

function InviteForm({ state, convite }: { state: InviteRegisterState; convite: ConvitePublico }) {
  const { form, setField, schoolWithoutEmail } = state;
  return <>
    <form onSubmit={(event) => void state.handleSubmit(event)} className="pas-form pas-form--grid">
      <AccountInput label="Nome para identificar você na turma" value={form.name} onChange={(event) => setField('name')(event.target.value)} minLength={3} maxLength={100} autoComplete="name" required />
      {convite.registration_mode === 'school_student' ? <SchoolStudentFields state={state} /> : <LegacyEmailFields state={state} convite={convite} />}
      <AccountSubmit busy={state.submitting || state.redirecting} busyLabel="Criando acesso...">
        {schoolWithoutEmail ? 'Criar minha conta' : 'Confirmar meu e-mail'}
      </AccountSubmit>
    </form>
    <p className="pas-note">{schoolWithoutEmail ? 'Entre com o usuário escolhido e sua senha.' : 'Confirme seu e-mail para ativar o acesso.'}</p>
    <RegistrationLegalNotice />
  </>;
}

export default function InviteRegister() {
  const state = useInviteRegister();
  const common = { titleId: TITLE_ID, character: inviteCharacter(state), feedback: state.feedback };

  if (state.loading) {
    return (
      <PublicAccountShell {...common} title="Validando seu convite..." busy>
        <AccountLoading />
      </PublicAccountShell>
    );
  }
  if (!state.convite) {
    return (
      <PublicAccountShell {...common} title={<>Convite <em>indisponível</em></>} lead="Este link expirou, foi revogado ou já foi utilizado.">
        <Link className="pas-cta" to="/login">Ir para o login</Link>
      </PublicAccountShell>
    );
  }
  if (state.createdUsername) {
    return (
      <PublicAccountShell {...common} title={<>Conta <em>criada</em></>} lead="Use seu usuário e a senha que você criou para entrar.">
        <AccountCode value={state.createdUsername} copyLabel="Copiar usuário" onCopy={state.copyUsername} />
        <Link className="pas-cta" to="/login">Ir para o login</Link>
      </PublicAccountShell>
    );
  }
  return (
    <PublicAccountShell
      {...common}
      title={<>Crie seu passe de <em>aventura</em></>}
      lead={<>Você vai entrar na turma de <strong>{state.convite.empresa_nome}</strong>.</>}
      wide
    >
      <InviteForm state={state} convite={state.convite} />
    </PublicAccountShell>
  );
}
