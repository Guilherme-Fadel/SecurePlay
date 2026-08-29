import { CheckCircle2, ListChecks } from 'lucide-react';
import type { ModuloDetalhes } from '@/services/conteudo';
import { AulaListItem } from './AulaListItem';

interface LessonNavigatorProps {
  modulo: ModuloDetalhes | null;
  activeAulaId: number;
  onSelectAula: (aulaId: number) => void;
}

export function LessonNavigator({ modulo, activeAulaId, onSelectAula }: LessonNavigatorProps) {
  if (!modulo) {
    return <div className="lesson-navigator-loading">Carregando roteiro...</div>;
  }

  return (
    <div className="lesson-navigator">
      <header>
        <div><ListChecks size={18} /><section><span>ROTEIRO</span><h2>Fases do módulo</h2></section></div>
        <strong>{modulo.completedAulas}/{modulo.totalAulas}</strong>
      </header>
      <div className="lesson-navigator-list">
        {modulo.aulas.map((aula, index) => (
          <AulaListItem
            key={aula.id}
            aula={aula}
            index={index}
            active={aula.id === activeAulaId}
            onClick={() => aula.id !== activeAulaId && onSelectAula(aula.id)}
          />
        ))}
      </div>
      {modulo.progress === 100 && (
        <div className="lesson-navigator-complete"><CheckCircle2 size={15} /> Módulo concluído</div>
      )}
    </div>
  );
}
