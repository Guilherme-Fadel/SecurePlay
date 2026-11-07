import { useCallback, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';

export type AccountPanel = 'notifications' | 'account' | null;

interface AccountGroupProps {
  openPanel: AccountPanel;
  onPanelChange: (panel: AccountPanel) => void;
  showAdmin: boolean;
  profileActive: boolean;
}

/**
 * Grupo de conta do trilho: o que o canvas não tem lugar (logo da escola,
 * notificações, perfil, tema, sair e Administrador). No desktop fica no pé do
 * trilho; no celular, à direita da barra.
 */
export function AccountGroup({ openPanel, onPanelChange, showAdmin, profileActive }: AccountGroupProps) {
  const { user } = useCurrentUser();
  const close = useCallback(() => onPanelChange(null), [onPanelChange]);
  const toggle = (panel: Exclude<AccountPanel, null>) => onPanelChange(openPanel === panel ? null : panel);

  return (
    <div className="sp-rail-account-group" role="group" aria-label="Conta">
      <SchoolLogo url={user?.empresa_logo} name={user?.empresa_nome} />
      <div className="sp-rail-account-row">
        <NotificationsMenu open={openPanel === 'notifications'} onToggle={() => toggle('notifications')} onClose={close} />
        <UserMenu open={openPanel === 'account'} onToggle={() => toggle('account')} onClose={close} showAdmin={showAdmin} profileActive={profileActive} />
      </div>
    </div>
  );
}

function SchoolLogo({ url, name }: { url?: string | null; name?: string | null }) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  if (!url || url === failedUrl) return null;
  return (
    <span className="sp-rail-school">
      <img src={url} alt={name ? `Logo de ${name}` : 'Logo da escola'} onError={() => setFailedUrl(url)} />
    </span>
  );
}
