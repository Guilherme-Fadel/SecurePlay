const NAV_ITEMS = [
  { label: 'INÍCIO', id: 'inicio' },
  { label: 'MISSÕES', id: 'missoes' },
  { label: 'SEGURANÇA', id: 'seguranca' },
  { label: 'CONTATO', id: 'contato' },
];

export function MobileMenu({ onClose }: any) {
  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
      onClose();
    }
  };

  return (
    <div className="md:hidden bg-[var(--background)] border-t border-[var(--primary)]">
      <div className="flex flex-col p-6 gap-4">
        {NAV_ITEMS.map((item) => (
          <button
            key={item.id}
            onClick={() => scrollToSection(item.id)}
            className="cursor-none text-left text-[var(--text-primary)]"
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}