import { useConteudos } from '@/hooks/useConteudos';
import { ModuloCard } from './ModuloCard';
import { Radio, Video, BookOpen } from 'lucide-react';

interface ModuloListProps {
  onSelectModulo: (moduloId: number) => void;
}

const typeFilters = [
  { key: 'todos', label: 'Todos', Icon: null },
  { key: 'video', label: 'Vídeos', Icon: Video },
  { key: 'quadrinho', label: 'Quadrinhos', Icon: BookOpen },
] as const;

const statusFilters = [
  { key: 'todos', label: 'Todos' },
  { key: 'em_progresso', label: 'Em progresso' },
  { key: 'concluidos', label: 'Concluídos' },
] as const;

export function ModuloList({ onSelectModulo }: ModuloListProps) {
  const { modulos, loading, filterType, setFilterType, filterStatus, setFilterStatus } = useConteudos();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[var(--text-secondary)] text-xl">Carregando operações...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <Radio size={24} className="text-[var(--accent)]" />
        <div>
          <h2 className="text-3xl text-[var(--accent)]">Central de Operações</h2>
          <p className="text-[var(--text-secondary)] font-[var(--font-family-inter)] text-sm">
            Selecione uma operação para iniciar seu treinamento, Agente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex gap-2">
          {typeFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterType(filter.key)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm border-2 transition-all ${
                filterType === filter.key
                  ? 'border-[var(--accent)] bg-[var(--accent)] text-[var(--background)]'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
              }`}
            >
              {filter.Icon && <filter.Icon size={14} />}
              {filter.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          {statusFilters.map((filter) => (
            <button
              key={filter.key}
              onClick={() => setFilterStatus(filter.key)}
              className={`px-3 py-1.5 text-sm border-2 transition-all font-[var(--font-family-inter)] ${
                filterStatus === filter.key
                  ? 'border-[var(--primary)] bg-[var(--primary)] text-white'
                  : 'border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--primary)]'
              }`}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {modulos.length === 0 ? (
        <div className="flex items-center justify-center h-48 bg-[var(--surface)] border-2 border-[var(--border)]">
          <p className="text-[var(--text-secondary)]">Nenhuma operação encontrada</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {modulos.map((modulo) => (
            <ModuloCard
              key={modulo.id}
              modulo={modulo}
              onClick={() => onSelectModulo(modulo.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
