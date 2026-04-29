import { Bell } from 'lucide-react';

const NOTIFICATIONS = [
  {
    id: 1,
    title: 'Testando Formato da Notificação',
    description: 'Testando Formato da Notificação"',
    time: 'Há 2 horas',
  },
  {
    id: 2,
    title: 'Testando Formato da Notificação 2',
    description: 'Testando Formato da Notificação 2"',
    time: 'Há 4 horas',
  },
  {
    id: 3,
    title: 'Testando Formato da Notificação com Scroll',
    description: 'Testando Formato da Notificação com Scroll"',
    time: 'Há 8 horas',
  }
  
];

interface NotificationsMenuProps {
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
}

export function NotificationsMenu({ open, onToggle, onClose }: NotificationsMenuProps) {
  return (
    <div className="relative">
      <button
        onClick={onToggle}
        className="relative p-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]"
      >
        <Bell size={20} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[var(--secondary)] rounded-full shadow-[0_0_6px_var(--secondary)]" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={onClose} />

          <div className="absolute right-0 top-12 w-80 bg-[var(--surface)] border-2 border-[var(--border)] rounded-lg shadow-xl z-50">
            <div className="p-4 border-b-2 border-[var(--border)]">
              <h3 className="text-[var(--text-primary)]">Notificações</h3>
            </div>

            <div className="max-h-96 overflow-y-auto">
              {NOTIFICATIONS.map((n) => (
                <div
                  key={n.id}
                  className="p-4 border-b border-[var(--border)] hover:bg-[var(--background)] cursor-pointer transition-colors"
                >
                  <p className="text-[var(--text-primary)] text-[var(--font-xs)]">{n.title}</p>
                  <p className="text-[var(--text-secondary)] text-[var(--font-xs)] mt-1 font-[var(--font-family-inter)]">
                    {n.description}
                  </p>
                  <p className="text-[var(--text-secondary)] text-[var(--font-xs)] mt-1 font-[var(--font-family-inter)]">
                    {n.time}
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
