import { useState } from 'react';
import { Search } from 'lucide-react';
import { SearchBar } from './SearchBar';
import { NotificationsMenu } from './NotificationsMenu';
import { UserMenu } from './UserMenu';

export function Header() {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const closeAll = () => {
    setShowNotifications(false);
    setShowUserMenu(false);
  };

  return (
    <header className="sticky top-0 z-40 h-16 bg-[var(--surface)] border-b-2 border-[var(--border)]">
      <div className="h-full px-4 md:px-6 flex items-center justify-between">

        <div className="flex-1 max-w-md hidden sm:block">
          <SearchBar />
        </div>

        <div className="sm:hidden">
          <button className="p-2 hover:bg-[var(--background)] rounded-md transition-colors text-[var(--text-primary)]">
            <Search size={20} />
          </button>
        </div>

        <div className="flex items-center gap-2">

          <NotificationsMenu
            open={showNotifications}
            onToggle={() => {
              setShowUserMenu(false);
              setShowNotifications((v) => !v);
            }}
            onClose={closeAll}
          />

          <UserMenu
            open={showUserMenu}
            onToggle={() => {
              setShowNotifications(false);
              setShowUserMenu((v) => !v);
            }}
            onClose={closeAll}
          />

        </div>
      </div>
    </header>
  );
}
