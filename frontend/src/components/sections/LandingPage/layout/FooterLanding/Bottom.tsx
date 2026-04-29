import { Link } from 'react-router-dom';

const LEGAL_LINKS = [
  { label: 'PRIVACIDADE', to: '/privacidade' },
  { label: 'TERMOS', to: '/termos' },
  { label: 'LGPD', to: '/lgpd' },
];

export function Bottom() {
  return (
    <>
      <div className="h-1 bg-[var(--surface-alt)] mb-8" />

      <div className="flex flex-col md:flex-row justify-between items-center gap-4">
        <p className="text-[var(--text-primary)]">
          © 2026 SECUREPLAY
        </p>

        <div className="flex gap-6">
          {LEGAL_LINKS.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="cursor-none text-[var(--text-primary)]  hover:text-[var(--secondary)] transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-8 text-center">
        <div className="inline-block bg-[var(--surface-alt)] border-2 border-[var(--primary)] px-6 py-2">
          <span className="text-[var(--primary)]">
            🎮 FEITO COM PAIXÃO POR SEGURANÇA 🛡️
          </span>
        </div>
      </div>
    </>
  );
}