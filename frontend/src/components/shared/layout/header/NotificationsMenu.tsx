import { useNavigate } from 'react-router-dom';
import {
  Bell,
  BellRing,
  CheckCheck,
  ClipboardList,
  Info,
  ShieldAlert,
  Sparkles,
  TrendingUp,
  Trophy,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { timeAgo, type Notification } from '@/services/notification';
import { RailPopover } from './RailPopover';

const PANEL_ID = 'sp-rail-notifications';

interface NotificationsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  /** `rail`: trilho do aluno (padrão). `console`: barra do topo do console administrativo. */
  variant?: 'rail' | 'console';
}

const TYPE_ICONS: Record<string, LucideIcon> = {
  conquista: Sparkles,
  progresso: TrendingUp,
  ranking: Trophy,
  turma: Users,
  gestao: ClipboardList,
  seguranca: ShieldAlert,
  aviso: Info,
};

function getNotificationIcon(type: string): LucideIcon {
  const normalizedType = type.toLowerCase();
  if (TYPE_ICONS[normalizedType]) return TYPE_ICONS[normalizedType];

  // Valores antigos gravados antes dos tipos fechados.
  if (normalizedType.includes('alert') || normalizedType.includes('seguran')) return ShieldAlert;
  if (normalizedType.includes('conquista') || normalizedType.includes('reward')) return Sparkles;
  return Info;
}

// O backend já valida o link; aqui só se aceita rota interna do app.
function internalLink(link: Notification['link']): string | null {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//') ? link : null;
}

export function NotificationsMenu({ open, onToggle, onClose, variant = 'rail' }: NotificationsMenuProps) {
  const isConsole = variant === 'console';
  const {
    notification,
    loading,
    hasUnread,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotification();
  const navigate = useNavigate();

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch {
      // A próxima atualização da lista preserva o estado correto caso a requisição falhe.
    }
  };

  const handleOpenItem = async (item: Notification) => {
    const target = internalLink(item.link);
    if (!item.readed) {
      try {
        await markAsRead(item.id);
      } catch {
        // Falha ao marcar como lida não impede a navegação.
      }
    }
    if (target) {
      onClose();
      navigate(target);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        className={isConsole ? 'admin-console-icon-button admin-console-bell' : 'sp-rail-account-button'}
        aria-label={hasUnread ? `Abrir notificações, ${unreadCount} não lidas` : 'Abrir notificações'}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? PANEL_ID : undefined}
        title="Notificações"
      >
        <Bell size={20} aria-hidden="true" />
        {hasUnread && (
          <span className={isConsole ? 'admin-console-bell-badge' : 'sp-rail-badge'} aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <RailPopover id={PANEL_ID} label="Notificações" className={isConsole ? 'notification-popover is-console' : 'notification-popover'} onClose={onClose}>
          <div className="notification-popover-header">
            <div className="notification-popover-title">
              <span className="notification-heading-icon"><BellRing size={17} /></span>
              <div>
                <h3>Notificações</h3>
                <p>{hasUnread ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}</p>
              </div>
            </div>
            <button
              type="button"
              className="notification-read-all"
              onClick={handleMarkAllAsRead}
              disabled={!hasUnread}
            >
              <CheckCheck size={15} />
              Ler todas
            </button>
          </div>

          <div className="notification-list" aria-live="polite">
            {loading && (
              <div className="notification-loading">Atualizando notificações...</div>
            )}
            {!loading && notification.length === 0 && (
              <div className="notification-empty">
                <span><Bell size={20} /></span>
                <strong>Nenhuma notificação por aqui</strong>
                <p>Quando houver novidades, elas aparecerão neste espaço.</p>
              </div>
            )}
            {!loading && notification.map((item) => {
              const Icon = getNotificationIcon(item.type);

              return (
              <button
                type="button"
                key={item.id}
                onClick={() => void handleOpenItem(item)}
                className={`notification-item ${!item.readed ? 'is-unread' : ''}`}
              >
                <span className="notification-item-icon"><Icon size={16} /></span>
                <span className="notification-item-content">
                  <span className="notification-item-title-row">
                    <strong>{item.title}</strong>
                    {!item.readed && <span className="notification-item-status">Nova</span>}
                  </span>
                  <span className="notification-item-message">{item.message}</span>
                  <span className="notification-item-time">{timeAgo(item.created_at)}</span>
                </span>
              </button>
              );
            })}
          </div>
        </RailPopover>
      )}
    </>
  );
}
