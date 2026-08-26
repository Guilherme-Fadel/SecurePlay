interface HeaderProps {
  completed: number;
  total: number;
}

// HUD superior: titulo do sistema + progresso global de fases concluidas.
export function Header({ completed, total }: HeaderProps) {
  const pct = total ? (completed / total) * 100 : 0;
  return (
    <header className="wm-header">
      <div className="wm-title">
        <span className="wm-logo">SECUREPLAY</span>
        <span className="wm-subtitle">Mapa de Treinamento</span>
      </div>
      <div className="wm-progress">
        <span>
          {completed} / {total} fases concluidas
        </span>
        <div className="wm-progress-bar">
          <div className="wm-progress-fill" style={{ width: `${pct}%` }} />
        </div>
      </div>
    </header>
  );
}
