import { AccountInput } from './PublicAccountUi';

type Props = {
  username: string;
  phone: string;
  usernameRequired?: boolean;
  disabled?: boolean;
  setUsername: (value: string) => void;
  setPhone: (value: string) => void;
};

export function RegistrationContactFields({ username, phone, usernameRequired = false, disabled = false, setUsername, setPhone }: Props) {
  return <>
    <AccountInput
      label="Usuário de acesso"
      optional={!usernameRequired}
      hint="Único na plataforma. Diferente do apelido de aventura."
      value={username}
      onChange={event => setUsername(event.target.value)}
      required={usernameRequired}
      disabled={disabled}
      autoComplete="username"
      autoCapitalize="none"
      spellCheck={false}
      minLength={3}
      maxLength={24}
      pattern="(?![sS][pP]-)[A-Za-z0-9][A-Za-z0-9._\-]{2,23}"
      title="3 a 24 letras sem acento, números, ponto, hífen ou sublinhado. SP- é reservado."
      placeholder="Ex.: joao.silva"
    />
    <AccountInput
      label="Telefone"
      optional
      type="tel"
      value={phone}
      onChange={event => setPhone(event.target.value)}
      disabled={disabled}
      autoComplete="tel"
      maxLength={24}
      placeholder="DDD + número"
    />
  </>;
}
