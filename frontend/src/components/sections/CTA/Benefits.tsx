export function CTABenefits() {
  const items = [
    { label: 'CONSULTA GRATUITA', icon: '💎' },
    { label: 'SUPORTE 24/7', icon: '🛡️' },
    { label: 'SEM RISCO', icon: '⭐' },
  ];

  return (
    <div className="mt-10 flex flex-col md:flex-row justify-center items-center gap-6">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-3">
          <div className="w-8 h-8 bg-[var(--primary)] border-2 border-[var(--border-primary)] flex items-center justify-center">
            {item.icon}
          </div>

          <span className="text-[var(--text-primary)]">
            {item.label}
          </span>
        </div>
      ))}
    </div>
  );
}