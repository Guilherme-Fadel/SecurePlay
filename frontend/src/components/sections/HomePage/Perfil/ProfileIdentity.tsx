import { useEffect, useRef, useState } from 'react';
import { BadgeCheck, Building2, Camera, Loader2, ShieldCheck } from 'lucide-react';
import { toast } from 'sonner';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { Avatar } from '@/components/ui/visuals/Avatar';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { presignProfileImage, requestNickname, saveProfileImage } from '@/services/profile';
import { preloadImages } from '@/lib/imageCache';
import { optimizeImageUpload } from '@/lib/optimizeImageUpload';
import { cn } from '@/lib/utils';
import type { CurrentUser } from '@/services/me';
import { apiErrorMessage, roleLabel } from './profileModel';

interface ProfileIdentityProps {
  user: CurrentUser | null;
  displayName: string;
  isManagementUser: boolean;
  /** visualValue da moldura equipada (cosmetics.css); vazio sem conquistas. */
  frame: string;
}

/** Card principal (cor da escola): foto, nome, papel, instituição e pedido de apelido. */
export function ProfileIdentity({ user, displayName, isManagementUser, frame }: ProfileIdentityProps) {
  return (
    <section className="pv-card pv-identity" aria-labelledby="pv-identity-name">
      <div className="pv-identity-main">
        <ProfilePhoto user={user} frame={frame} useNickname={!isManagementUser} />
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

/** useNickname: gestão usa o nome do cadastro nas iniciais (paridade com o HEAD). */
function ProfilePhoto({ user, frame, useNickname }: { user: CurrentUser | null; frame: string; useNickname: boolean }) {
  const { refreshSession } = useCurrentUser();
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewObjectUrlRef = useRef<string | null>(null);

  useEffect(() => () => {
    if (photoPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(photoPreviewObjectUrlRef.current);
    }
  }, []);

  const handlePhotoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const allowedTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      toast.error('Escolha uma imagem PNG, JPEG ou WebP.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no máximo 2 MB.');
      return;
    }

    setPhotoUploading(true);
    let nextPreviewUrl: string | null = null;
    try {
      const uploadFile = await optimizeImageUpload(file, {
        maxWidth: 512,
        maxHeight: 512,
      });
      nextPreviewUrl = URL.createObjectURL(uploadFile);
      const { uploadUrl, fields, key } = await presignProfileImage(uploadFile.type);
      const formData = new FormData();
      Object.entries(fields).forEach(([name, value]) => formData.append(name, value));
      formData.append('file', uploadFile);
      const uploadResponse = await fetch(uploadUrl, { method: 'POST', body: formData });
      if (!uploadResponse.ok) throw new Error('Falha ao enviar a imagem');
      const result = await saveProfileImage(key);
      if (photoPreviewObjectUrlRef.current) URL.revokeObjectURL(photoPreviewObjectUrlRef.current);
      photoPreviewObjectUrlRef.current = nextPreviewUrl;
      setPhotoPreviewUrl(nextPreviewUrl);
      nextPreviewUrl = null;
      preloadImages([result.profile_image_url]);
      await refreshSession();
      toast.success(result.message);
    } catch {
      toast.error('Não foi possível atualizar sua foto agora.');
    } finally {
      if (nextPreviewUrl) URL.revokeObjectURL(nextPreviewUrl);
      setPhotoUploading(false);
      if (photoInputRef.current) photoInputRef.current.value = '';
    }
  };

  return (
    <div className="pv-photo">
      <label
        className={cn('pv-photo-upload', photoUploading && 'is-uploading')}
        title={photoUploading ? 'Enviando nova foto...' : 'Clique para alterar sua foto'}
      >
        <Avatar
          name={user?.name}
          nickname={useNickname ? user?.nickname : null}
          imageUrl={photoPreviewUrl || user?.profile_image_url}
          className={cn('pv-avatar cosmetic-avatar', frame)}
        />
        <span className="pv-photo-action" aria-hidden="true">
          {photoUploading ? <Loader2 size={18} className="pv-spin" /> : <Camera size={18} />}
        </span>
        <input
          ref={photoInputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          aria-label={photoUploading ? 'Enviando nova foto de perfil' : 'Alterar foto de perfil'}
          onChange={handlePhotoUpload}
          disabled={photoUploading}
        />
      </label>
      <p className="pv-sr" role="status">{photoUploading ? 'Enviando nova foto de perfil.' : ''}</p>
    </div>
  );
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
          pattern="[A-Za-zÀ-ÿ0-9 _-]+"
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