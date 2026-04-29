const NAV_ITEMS = [
  { label: 'INÍCIO', id: 'inicio' },
  { label: 'MISSÕES', id: 'missoes' },
  { label: 'SEGURANÇA', id: 'seguranca' },
  { label: 'CONTATO', id: 'contato' },
];

export function Nav() {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <nav className="hidden md:flex gap-8">
      {NAV_ITEMS.map((item) => (
        <NavItem
          key={item.id}
          label={item.label}
          onClick={() => scrollToSection(item.id)}
        />
      ))}
    </nav>
  );
}

function NavItem({ label, onClick }: any) {
  return (
    <button
      onClick={onClick}
      className="cursor-none text-[var(--text-primary)]   hover:text-[var(--secondary)] transition-colors relative group"
    >
      {label}

      <span className="absolute -bottom-1 left-0 w-0 h-1 bg-[var(--secondary)] group-hover:w-full transition-all duration-300" />
    </button>
  );
}