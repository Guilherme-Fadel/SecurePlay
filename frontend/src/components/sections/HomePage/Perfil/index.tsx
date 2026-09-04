import { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Building2,
  Camera,
  Check,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Mail,
  Medal,
  Settings2,
  ShieldCheck,
  Sparkles,
  Target,
  Trophy,
  UserRound,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { PageTransition } from '@/components/shared/PageTransition';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { InfoCard } from '@/components/ui/visuals/InfoCard';
import { Modal } from '@/components/ui/modal';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useDashboardStats } from '@/hooks/useDashboard';
import { useSectionContext } from '@/contexts/SectionContext';
import { changePassword, presignProfileImage, requestNickname, saveProfileImage } from '@/services/profile';
import { passwordValidationMessage } from '@/lib/password-policy';
import { preloadImages } from '@/lib/imageCache';
import { optimizeImageUpload } from '@/lib/optimizeImageUpload';

function initials(name?: string) {
  const parts = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'SP';
}

function roleLabel(role?: string) {
  if (role === 'platform_admin') return 'Administrador da plataforma';
  if (role === 'admin') return 'Administrador';
  return 'Participante';
}

function formatNumber(value: number) {
  return value.toLocaleString('pt-BR');
}

export function Perfil() {
  const { user, loading: userLoading, refreshSession } = useCurrentUser();
  const { stats, loading: statsLoading } = useDashboardStats();
  const { navigateToSection } = useSectionContext();
  const [emailCopied, setEmailCopied] = useState(false);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showPasswords, setShowPasswords] = useState({ current: false, next: false, confirmation: false });
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [nicknameDraft, setNicknameDraft] = useState('');
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const photoPreviewObjectUrlRef = useRef<string | null>(null);

  const points = stats?.totalPoints ?? 0;
  const xpToNextLevel = stats?.xpToNextLevel ?? 0;
  const xpCeiling = points + xpToNextLevel;
  const xpProgress = stats && xpCeiling > 0 ? Math.min(100, Math.round((points / xpCeiling) * 100)) : 0;
  const displayName = user?.nickname || user?.name || (userLoading ? 'Carregando perfil...' : 'Participante SecurePlay');
  const firstName = displayName.split(/\s+/)[0] || 'você';
  const companyName = user?.empresa_nome || 'Comunidade SecurePlay';
  const displayLevel = stats?.level ?? user?.level;

  useEffect(() => {
    setNicknameDraft(user?.nickname ?? '');
  }, [user?.nickname]);

  useEffect(() => () => {
    if (photoPreviewObjectUrlRef.current) {
      URL.revokeObjectURL(photoPreviewObjectUrlRef.current);
    }
  }, []);

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
      const response = error as { response?: { data?: { message?: string | string[] } } };
      const message = response.response?.data?.message;
      toast.error(Array.isArray(message) ? message[0] : message || 'Não foi possível enviar o apelido.');
    } finally {
      setNicknameSaving(false);
    }
  };

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

  const handleCopyEmail = async () => {
    if (!user?.email) return;

    try {
      if (!navigator.clipboard) throw new Error('Clipboard indisponível');
      await navigator.clipboard.writeText(user.email);
      setEmailCopied(true);
      toast.success('E-mail copiado para a área de transferência.');
      window.setTimeout(() => setEmailCopied(false), 2200);
    } catch {
      toast.error('Não foi possível copiar o e-mail neste navegador.');
    }
  };

  // force so e true no sucesso da troca de senha. Nunca ligar direto em onClick/
  // onClose: o React passa o evento como argumento e, sendo truthy, ele anularia
  // a protecao de passwordSaving abaixo.
  const closePasswordModal = (force = false) => {
    if (passwordSaving && !force) return;
    setPasswordModalOpen(false);
    setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
    setPasswordError(null);
  };

  const handlePasswordChange = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPasswordError(null);

    if (!passwords.currentPassword || !passwords.newPassword || !passwords.confirmPassword) {
      setPasswordError('Preencha todos os campos para continuar.');
      return;
    }
    const newPasswordError = passwordValidationMessage(passwords.newPassword);
    if (newPasswordError) {
      setPasswordError(newPasswordError);
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('A confirmação não corresponde à nova senha.');
      return;
    }
    if (passwords.currentPassword === passwords.newPassword) {
      setPasswordError('Escolha uma nova senha diferente da atual.');
      return;
    }

    setPasswordSaving(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      toast.success('Senha alterada com sucesso.');
      closePasswordModal(true);
    } catch (error: unknown) {
      const response = error as { response?: { data?: { message?: string | string[] } } };
      const message = response.response?.data?.message;
      setPasswordError(Array.isArray(message) ? message[0] : message || 'Não foi possível alterar a senha. Tente novamente.');
    } finally {
      setPasswordSaving(false);
    }
  };

  return (
    <PageTransition>
      <div className="profile-page app-page">
        <header className="profile-page-heading">
          <div>
            <span className="profile-eyebrow"><UserRound size={13} /> Conta</span>
            <h1>Meu Perfil</h1>
            <p>Veja sua identidade, progresso e informações de acesso na plataforma.</p>
          </div>
          <AppButton
            size="sm"
            variant="ghost"
            icon={<Settings2 size={15} />}
            onClick={() => navigateToSection('configuracoes')}
          >
            Configurações
          </AppButton>
        </header>

        <InfoCard raised className="profile-hero">
          <div className="profile-hero-accent" aria-hidden="true" />
          <div className="profile-hero-main">
            <label
              className={`profile-avatar profile-avatar-upload ${photoUploading ? 'is-uploading' : ''}`}
              aria-label={photoUploading ? 'Enviando nova foto de perfil' : 'Alterar foto de perfil'}
              title={photoUploading ? 'Enviando nova foto...' : 'Clique para alterar sua foto'}
            >
              {photoPreviewUrl || user?.profile_image_url ? <img src={photoPreviewUrl || user?.profile_image_url || ''} alt="" /> : initials(displayName)}
              <span className="profile-avatar-upload-action" aria-hidden="true">
                <Camera size={18} />
              </span>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={handlePhotoUpload}
                disabled={photoUploading}
              />
            </label>
            <div className="profile-identity">
              <div className="profile-identity-heading">
                <h2>{displayName}</h2>
                <span className="profile-role-chip"><ShieldCheck size={13} /> {roleLabel(user?.role)}</span>
              </div>
              <div className="profile-identity-meta">
                <span><Building2 size={14} /> {companyName}</span>
                <span><BadgeCheck size={14} /> Conta ativa</span>
              </div>
              <div className="profile-email-line">
                <Mail size={14} />
                <span>{user?.email ?? (userLoading ? 'Sincronizando e-mail...' : 'E-mail não informado')}</span>
                {user?.email && (
                  <button
                    type="button"
                    className="profile-copy-email"
                    onClick={handleCopyEmail}
                    aria-label={emailCopied ? 'E-mail copiado' : 'Copiar e-mail'}
                    title={emailCopied ? 'E-mail copiado' : 'Copiar e-mail'}
                  >
                    {emailCopied ? <Check size={14} /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="profile-hero-action">
            <form className="profile-nickname-form profile-hero-nickname-form" onSubmit={handleNicknameRequest}>
              <div className="profile-nickname-heading">
                <label htmlFor="profile-nickname">Apelido no ranking</label>
                {user?.nickname && user.nickname_request_status !== 'pending' && <span>Atual: {user.nickname}</span>}
              </div>
              <div>
                <input id="profile-nickname" value={nicknameDraft} onChange={(event) => setNicknameDraft(event.target.value)} minLength={3} maxLength={24} pattern="[A-Za-zÀ-ÿ0-9 _-]+" disabled={nicknameSaving || user?.nickname_request_status === 'pending'} placeholder="Ex.: Guardião Solar" />
                <AppButton type="submit" size="sm" disabled={nicknameSaving || user?.nickname_request_status === 'pending'}>{nicknameSaving ? 'Enviando...' : 'Pedir aprovação'}</AppButton>
              </div>
              {user?.nickname_request_status === 'pending' && <p className="profile-nickname-status is-pending">Pedido para “{user.nickname_pending}” aguardando aprovação.</p>}
              {user?.nickname_request_status === 'rejected' && <p className="profile-nickname-status is-rejected">O último pedido não foi aprovado. Tente outro apelido.</p>}
            </form>
          </div>

          <div className="profile-level-summary">
            <span>Seu nível</span>
            <strong>{displayLevel ?? '—'}</strong>
            <small>{statsLoading ? 'Atualizando evolução' : `${formatNumber(points)} XP acumulados`}</small>
          </div>
        </InfoCard>

        <div className="profile-layout">
          <div className="profile-main-column">
            <InfoCard raised className="profile-progress-card">
              <InfoCard.Header
                title="Sua evolução"
                subtitle="Seu avanço é atualizado conforme você participa da plataforma."
                icon={Zap}
                variant="primary"
              />
              <InfoCard.Section>
                <div className="profile-progress-headline">
                  <div>
                    <span>Progresso para o próximo nível</span>
                    <strong>{stats ? `${formatNumber(points)} XP` : 'Aguardando dados de evolução'}</strong>
                  </div>
                  <b>{stats ? `${xpProgress}%` : '—'}</b>
                </div>
                <div className="profile-xp-track" aria-label={stats ? `${xpProgress}% do nível atual` : 'Progresso de nível indisponível'}>
                  <i style={{ width: `${xpProgress}%` }} />
                </div>
                <div className="profile-progress-footnote">
                  <span>{stats ? `${formatNumber(xpToNextLevel)} XP para avançar` : 'Complete atividades para começar sua evolução.'}</span>
                  {displayLevel !== undefined && <span>Nível {displayLevel}</span>}
                </div>
              </InfoCard.Section>
              <InfoCard.Footer>
                <span className="profile-card-footnote">Conquistas e itens cosméticos acompanham seu perfil.</span>
                <AppButton size="sm" variant="soft" icon={<Sparkles size={14} />} onClick={() => navigateToSection('conquistas')}>
                  Ver conquistas
                </AppButton>
              </InfoCard.Footer>
            </InfoCard>

            <InfoCard raised className="profile-account-card">
              <InfoCard.Header
                title="Informações da conta"
                subtitle="Dados vinculados ao seu acesso atual."
                icon={ShieldCheck}
                variant="secondary"
              />
              <InfoCard.Section className="profile-account-list">
                <ProfileDetail icon={Mail} label="E-mail de acesso" value={user?.email ?? 'Não informado'} />
                <ProfileDetail icon={UserRound} label="Nome do cadastro" value={user?.name ?? 'Não informado'} />
                <ProfileDetail icon={Building2} label="Organização" value={companyName} />
                <ProfileDetail icon={UserRound} label="Tipo de conta" value={roleLabel(user?.role)} />
              </InfoCard.Section>
              <InfoCard.Footer>
                <span className="profile-card-footnote">Mantenha sua senha única e não a compartilhe com outras pessoas.</span>
                <AppButton size="sm" variant="soft" icon={<KeyRound size={14} />} onClick={() => setPasswordModalOpen(true)}>
                  Alterar senha
                </AppButton>
              </InfoCard.Footer>
            </InfoCard>

          </div>

          <aside className="profile-side-column">
            <InfoCard raised className="profile-stats-card">
              <div className="profile-stats-heading">
                <div><Trophy size={16} /><span>Resumo da jornada</span></div>
                <small>{statsLoading ? 'Sincronizando' : 'Atualizado agora'}</small>
              </div>
              <div className="profile-stats-grid">
                <ProfileStat icon={Zap} label="XP total" value={stats ? formatNumber(points) : '—'} variant="primary" />
                <ProfileStat icon={Trophy} label="Ranking" value={stats ? `#${stats.globalRanking}` : '—'} variant="accent" />
                <ProfileStat icon={Medal} label="Desafios" value={stats ? `${stats.completedChallenges}/${stats.totalActiveChallenges}` : '—'} variant="secondary" />
              </div>
            </InfoCard>

            <InfoCard raised className="profile-next-card">
              <div className="profile-next-icon"><Target size={19} /></div>
              <div>
                <span>Próximo passo</span>
                <h3>{stats && xpToNextLevel > 0 ? `Faltam ${formatNumber(xpToNextLevel)} XP para o próximo nível.` : `Continue avançando, ${firstName}.`}</h3>
                <p>Complete conteúdos e desafios para fortalecer sua jornada de segurança.</p>
              </div>
              <AppButton size="sm" icon={<Zap size={14} />} onClick={() => navigateToSection('conteudos')}>
                Ver conteúdos
              </AppButton>
            </InfoCard>

            <div className="profile-protection-note">
              <ShieldCheck size={16} />
              <span>Seu perfil está protegido pela sessão segura do Security Play.</span>
            </div>
          </aside>
        </div>

        <Modal open={passwordModalOpen} onClose={() => closePasswordModal()} title="Alterar senha" maxWidth="max-w-md">
          <form className="profile-password-form" onSubmit={handlePasswordChange}>
            <p className="profile-password-intro">Para sua proteção, confirme a senha atual antes de escolher uma nova.</p>
            <PasswordField
              id="current-password"
              label="Senha atual"
              value={passwords.currentPassword}
              visible={showPasswords.current}
              autoComplete="current-password"
              onVisibilityToggle={() => setShowPasswords((current) => ({ ...current, current: !current.current }))}
              onChange={(value) => setPasswords((current) => ({ ...current, currentPassword: value }))}
            />
            <PasswordField
              id="new-password"
              label="Nova senha"
              hint="Use ao menos 6 caracteres e no máximo 72 bytes."
              value={passwords.newPassword}
              visible={showPasswords.next}
              autoComplete="new-password"
              onVisibilityToggle={() => setShowPasswords((current) => ({ ...current, next: !current.next }))}
              onChange={(value) => setPasswords((current) => ({ ...current, newPassword: value }))}
            />
            <PasswordField
              id="confirm-password"
              label="Confirmar nova senha"
              value={passwords.confirmPassword}
              visible={showPasswords.confirmation}
              autoComplete="new-password"
              onVisibilityToggle={() => setShowPasswords((current) => ({ ...current, confirmation: !current.confirmation }))}
              onChange={(value) => setPasswords((current) => ({ ...current, confirmPassword: value }))}
            />
            {passwordError && <p className="profile-password-error" role="alert">{passwordError}</p>}
            <div className="profile-password-actions">
              <AppButton type="button" variant="ghost" onClick={() => closePasswordModal()} disabled={passwordSaving}>Cancelar</AppButton>
              <AppButton type="submit" icon={<KeyRound size={15} />} disabled={passwordSaving}>{passwordSaving ? 'Alterando...' : 'Salvar nova senha'}</AppButton>
            </div>
          </form>
        </Modal>
      </div>
    </PageTransition>
  );
}

function PasswordField({
  id, label, hint, value, visible, autoComplete, onChange, onVisibilityToggle,
}: {
  id: string;
  label: string;
  hint?: string;
  value: string;
  visible: boolean;
  autoComplete: string;
  onChange: (value: string) => void;
  onVisibilityToggle: () => void;
}) {
  return <label className="profile-password-field" htmlFor={id}>
    <span>{label}</span>
    <div>
      <input id={id} type={visible ? 'text' : 'password'} value={value} autoComplete={autoComplete} onChange={(event) => onChange(event.target.value)} />
      <button type="button" onClick={onVisibilityToggle} aria-label={visible ? `Ocultar ${label.toLowerCase()}` : `Mostrar ${label.toLowerCase()}`}>{visible ? <EyeOff size={16} /> : <Eye size={16} />}</button>
    </div>
    {hint && <small>{hint}</small>}
  </label>;
}

function ProfileDetail({ icon: Icon, label, value }: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="profile-account-row">
      <span className="profile-account-icon"><Icon size={16} /></span>
      <span>{label}</span>
      <strong title={value}>{value}</strong>
    </div>
  );
}

function ProfileStat({ icon: Icon, label, value, variant }: {
  icon: typeof Zap;
  label: string;
  value: string;
  variant: 'primary' | 'secondary' | 'accent';
}) {
  return (
    <div className={`profile-stat profile-stat-${variant}`}>
      <Icon size={16} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
