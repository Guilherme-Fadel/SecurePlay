import { useState } from 'react';
import '@/styles/learning-ui.css';
import { PageTransition } from '@/components/shared/PageTransition';
import { ModuloList } from './ModuloList';
import { ModuloDetalhes } from './ModuloDetalhes';
import { AulaVideo } from './AulaVideo';
import { AulaQuadrinho } from './AulaQuadrinho';

type View =
  | { type: 'listagem' }
  | { type: 'modulo'; moduloId: number }
  | { type: 'aula'; aulaId: number; moduloId: number };

export function Conteudos() {
  const [view, setView] = useState<View>({ type: 'listagem' });

  const goToListagem = () => setView({ type: 'listagem' });
  const goToModulo = (moduloId: number) => setView({ type: 'modulo', moduloId });
  const goToAula = (aulaId: number, moduloId: number) => setView({ type: 'aula', aulaId, moduloId });

  return (
    <PageTransition>
      {view.type === 'listagem' && (
        <ModuloList onSelectModulo={goToModulo} />
      )}
      {view.type === 'modulo' && (
        <ModuloDetalhes
          moduloId={view.moduloId}
          onBack={goToListagem}
          onSelectAula={(aulaId: number) => goToAula(aulaId, view.moduloId)}
        />
      )}
      {view.type === 'aula' && (
        <AulaView
          key={view.aulaId}
          aulaId={view.aulaId}
          moduloId={view.moduloId}
          onBack={() => goToModulo(view.moduloId)}
          onSelectAula={(aulaId) => goToAula(aulaId, view.moduloId)}
        />
      )}
    </PageTransition>
  );
}

function AulaView({ aulaId, moduloId, onBack, onSelectAula }: { aulaId: number; moduloId: number; onBack: () => void; onSelectAula: (aulaId: number) => void }) {
  const [aulaType, setAulaType] = useState<'video' | 'quadrinho' | null>(null);

  if (aulaType === 'quadrinho') {
    return <AulaQuadrinho aulaId={aulaId} moduloId={moduloId} onBack={onBack} onSelectAula={onSelectAula} />;
  }

  return (
    <AulaVideo
      aulaId={aulaId}
      moduloId={moduloId}
      onBack={onBack}
      onTypeResolved={setAulaType}
      onSelectAula={onSelectAula}
    />
  );
}
