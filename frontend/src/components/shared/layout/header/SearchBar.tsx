import { Search } from 'lucide-react';

export function SearchBar() {
  return (
    <div className="relative flex items-center">
      <span className="absolute left-3 text-[var(--text-secondary)] pointer-events-none">
        <Search size={18} />
      </span>
      <input
        type="text"
        placeholder="Buscar desafios, conquistas..."
        className="
          w-full pl-10 pr-4 py-2
          bg-[var(--background)] border-2 border-[var(--border)]
          rounded-md text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]
          focus:outline-none focus:border-[var(--primary)]
          transition-colors
          font-[var(--font-family-inter)] text-[var(--font-xs)]
        "
      />
    </div>
  );
}
