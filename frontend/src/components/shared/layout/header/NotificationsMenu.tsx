import { Bell } from 'lucide-react';
import { useNotification } from '@/hooks/useNotification';
import { timeAgo } from '@/services/notification';

interface NotificationsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function NotificationsMenu({ open, onToggle, onClose }: NotificationsMenuProps) {
  const { notification, loading, hasUnread, markAsRead } = useNotification();

  if (loading) return null;

  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative p-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]"
      >
        <Bell size={20} />
        {hasUnread && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <div className="absolute right-0 top-12 w-80 bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg shadow-xl z-50">
            <div className="p-4 border-b-2 border-[var(--border)]">
              <h3 className="text-[var(--text-primary)]">Notificações</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {notification.length === 0 && (
                <p className="p-4 text-[var(--text-secondary)] text-sm text-center">Nenhuma notificação</p>
              )}
              {notification.map((item) => (
                <div
                  key={item.id}
                  onClick={() => { if (!item.readed) markAsRead(item.id); }}
                  className={`p-4 border-b border-[var(--border)] transition-colors hover:bg-[var(--background)] ${!item.readed ? 'cursor-pointer border-l-2 border-l-red-500' : 'cursor-default'}`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className={`text-[var(--font-xs)] ${!item.readed ? 'text-[var(--text-primary)] font-semibold' : 'text-[var(--text-secondary)]'}`}>
                      {item.title}
                    </p>
                    {!item.readed && (
                      <span className="w-2 h-2 min-w-[8px] bg-red-500 rounded-full" />
                    )}
                  </div>
                  <p className="text-[var(--text-secondary)] text-[var(--font-xs)] mt-1 font-[var(--font-family-inter)]">
                    {item.message}
                  </p>
                  <p className="text-[var(--text-secondary)] text-[var(--font-xs)] mt-1 font-[var(--font-family-inter)]">
                    {timeAgo(item.created_at)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
