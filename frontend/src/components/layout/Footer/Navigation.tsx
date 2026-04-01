import { Link } from 'react-router-dom';

const NAV_LINKS = [
  { label: 'Início', to: '#inicio' },
  { label: 'Missões', to: '#missoes' },
  { label: 'Como Funciona', to: '#como-funciona' },
  { label: 'Benefícios', to: '#beneficios' },
  { label: 'Contato', to: '#contato' },
];

export function Navigation() {
  return (
    <div>
      <h3 className="font-['Press_Start_2P'] text-xs text-[var(--secondary)] mb-6">
        NAVEGAÇÃO
      </h3>

      <ul className="space-y-3">
        {NAV_LINKS.map((link) => (
          <li key={link.label}>
            <Link
              to={link.to}
              className="cursor-none text-[var(--text-primary)] text-sm hover:text-[var(--secondary)] transition-colors flex items-center gap-2"
            >
              <span className="w-2 h-2 bg-[var(--primary)] border border-[var(--border-primary)]" />
              {link.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}