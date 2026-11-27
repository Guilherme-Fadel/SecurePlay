import { useEffect, useState } from 'react';
import { BadgeCheck, Building2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { UserCharacter } from '@/components/shared/Character/UserCharacter';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { requestNickname } from '@/services/profile';
import type { CurrentUser } from '@/services/me';
import { apiErrorMessage, roleLabel } from './profileModel';

interface ProfileIdentityProps {
  user: CurrentUser | null;
  displayName: string;
  isManagementUser: boolean;
}

/** Card principal (cor da escola): personagem, nome, papel, instituição e pedido de apelido. */
export function ProfileIdentity({ user, displayName, isManagementUser }: ProfileIdentityProps) {
  return (
    <section className="pv-card pv-identity" aria-labelledby="pv-identity-name">
      <div className="pv-identity-main">
        <ProfilePhoto />
        <div className="pv-identity-copy">
          <p className="pv-eyebrow pv-on-primary">Sua identidade</p>
          <h2 id="pv-identity-name" className="pv-display pv-identity-name">{displayName}</h2>
          <ul className="pv-identity-tags" aria-label="Dados da conta">
            <li><ShieldCheck size={15} aria-hidden="true" /> {roleLabel(user?.role)}</li>
            <li><Building2 size={15} aria-hidden="true" /> <span className="pv-ellipsis">{user?.empresa_nome || 'Comunidade SecurePlay'}</span></li>
            <li><BadgeCheck size={15} aria-hidden="true" /> {user?.active === false ? 'Conta inativa' : 'Conta ativa'}</li>
          </ul>
        </div>
      </div>
      {!isManagementUser && <NicknameForm user={user} />}
    </section>
  );
}

/** O personagem montável do aluno (sem foto nem upload), solto, sem placa, moldura ou fundo. */
function ProfilePhoto() {
  return <UserCharacter className="pv-avatar" />;
}

function NicknameForm({ user }: { user: CurrentUser | null }) {
  const { refreshSession } = useCurrentUser();
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const pending = user?.nickname_request_status === 'pending';
  const rejected = user?.nickname_request_status === 'rejected';

  useEffect(() => {
    setNicknameDraft(user?.nickname ?? '');
  }, [user?.nickname]);

  const handleNicknameRequest = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const requestedNickname = nicknameDraft.trim();
    if (!requestedNickname) {
      toast.error('Escolha um apelido de aventura para enviar.');
      return;
    }

    setNicknameSaving(true);
    try {
      const result = await requestNickname(requestedNickname);
      await refreshSession();
      toast.success(result.message);
    } catch (error: unknown) {
      toast.error(apiErrorMessage(error, 'Não foi possível enviar o apelido.'));
    } finally {
      setNicknameSaving(false);
    }
  };

  const describedBy = pending || rejected ? 'pv-nickname-hint pv-nickname-status' : 'pv-nickname-hint';

  return (
    <form className="pv-nickname" onSubmit={handleNicknameRequest} aria-busy={nicknameSaving || undefined}>
      <div className="pv-nickname-head">
        <label htmlFor="profile-nickname">Apelido no ranking</label>
        {user?.nickname && !pending && <span className="pv-ellipsis">Atual: {user.nickname}</span>}
      </div>
      <p id="pv-nickname-hint" className="pv-nickname-hint">De 3 a 24 caracteres: letras, números, espaço, _ ou -. Passa por aprovação.</p>
      <div className="pv-nickname-row">
        <AppInput
          id="profile-nickname"
          className="pv-nickname-input"
          value={nicknameDraft}
          onChange={(event) => setNicknameDraft(event.target.value)}
          minLength={3}
          maxLength={24}
          pattern="[\p{L}\p{N} _\-]+"
          disabled={nicknameSaving || pending}
          placeholder="Ex.: Guardião Solar"
          aria-describedby={describedBy}
        />
        <AppButton type="submit" variant="chunky" tone="yellow" size="sm" disabled={nicknameSaving || pending}>
          {nicknameSaving ? 'Enviando...' : 'Pedir aprovação'}
        </AppButton>
      </div>
      <NicknameStatus user={user} />
    </form>
  );
}

function NicknameStatus({ user }: { user: CurrentUser | null }) {
  if (user?.nickname_request_status === 'pending') {
    return <p id="pv-nickname-status" className="pv-nickname-status is-pending">Pedido para “{user.nickname_pending}” aguardando aprovação.</p>;
  }
  if (user?.nickname_request_status === 'rejected') {
    return <p id="pv-nickname-status" className="pv-nickname-status is-rejected">O último pedido não foi aprovado. Tente outro apelido.</p>;
  }
  return null;
}