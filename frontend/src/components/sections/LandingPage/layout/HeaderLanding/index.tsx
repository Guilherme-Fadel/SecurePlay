import { useState } from 'react';
import { Logo } from './Logo';
import { Nav } from './Nav';
import { MobileMenu } from './MobileMenu';

export function Header() {
  const [open, setOpen] = useState(false);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[var(--background)]/70 backdrop-blur-md border-b border-[var(--primary-30)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        
        <Logo />
        <Nav />

        <MobileMenuButton onClick={() => setOpen(!open)} />

      </div>

      {open && <MobileMenu onClose={() => setOpen(false)} />}
    </header>
  );
}

function MobileMenuButton({ onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="cursor-pointer md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5"
    >
      <div className="w-6 h-1 bg-[var(--background-primary)]"></div>
      <div className="w-6 h-1 bg-[var(--background-primary)]"></div>
      <div className="w-6 h-1 bg-[var(--background-primary)]"></div>
    </button>
  );
}