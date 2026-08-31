import { Bell, BellRing, CheckCheck, Info, ShieldAlert, Sparkles } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { timeAgo } from '@/services/notification';

interface NotificationsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function NotificationsMenu({ open, onToggle, onClose }: NotificationsMenuProps) {
  const {
    notification,
    loading,
    hasUnread,
    unreadCount,
    markAsRead,
    markAllAsRead,
  } = useNotification();

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
    } catch {
      // A próxima atualização da lista preserva o estado correto caso a requisição falhe.
    }
  };

  const getNotificationIcon = (type: string) => {
    const normalizedType = type.toLowerCase();

    if (normalizedType.includes('alert') || normalizedType.includes('seguran')) {
      return ShieldAlert;
    }

    if (normalizedType.includes('conquista') || normalizedType.includes('reward')) {
      return Sparkles;
    }

    return Info;
  };

  return (
    <div className="notifications-menu">
      <button
        onClick={onToggle}
        className="notification-trigger"
        aria-label="Abrir notificações"
        aria-expanded={open}
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="notification-unread-badge" aria-label={`${unreadCount} notificações não lidas`}>
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <section className="notification-popover" aria-label="Notificações">
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
                  onClick={() => { if (!item.readed) void markAsRead(item.id); }}
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
          </section>
        </>
      )}
    </div>
  );
}
