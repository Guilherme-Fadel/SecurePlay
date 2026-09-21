import { useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Search, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import {
  aprovarApelido,
  listarApelidosPendentes,
  rejeitarApelido,
  type ApelidosPendentesPaginados,
} from '@/services/convites';

interface PendingNicknamesTabProps {
  empresaId?: number;
  empresaNome?: string;
}

const emptyResult: ApelidosPendentesPaginados = {
  items: [], page: 1, pageSize: 25, total: 0, totalPages: 0,
};

export function PendingNicknamesTab({ empresaId, empresaNome }: PendingNicknamesTabProps) {
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(emptyResult);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => { setPage(1); }, [deferredSearch, empresaId]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    void listarApelidosPendentes({ page, search: deferredSearch }, empresaId)
      .then((next) => {
        if (!cancelled) setResult(next);
      })
      .catch(() => {
        if (!cancelled) setFeedback('Não foi possível carregar os apelidos pendentes.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, empresaId, page]);

  const revisar = async (usuarioId: number, aprovado: boolean) => {
    setReviewing(usuarioId);
    setFeedback(null);
    try {
      await (aprovado
        ? aprovarApelido(usuarioId, empresaId)
        : rejeitarApelido(usuarioId, empresaId));
      setResult((current) => ({
        ...current,
        total: Math.max(0, current.total - 1),
        items: current.items.filter((item) => item.id !== usuarioId),
      }));
      setFeedback(aprovado ? 'Apelido aprovado e liberado no ranking.' : 'Pedido de apelido recusado.');
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível revisar o apelido.');
    } finally {
      setReviewing(null);
    }
  };

  const pageCount = Math.max(1, result.totalPages);
  return (
    <div className="admin-users-content">
      <div className="admin-users-heading">
        <div>
          <span className="admin-page-eyebrow">Moderação {empresaNome ? `· ${empresaNome}` : 'da empresa'}</span>
          <h1>Apelidos pendentes</h1>
          <p>Revise os apelidos antes que sejam exibidos no ranking da turma.</p>
        </div>
        <div className="admin-users-stat"><CheckCircle2 size={18} /><span><strong>{result.total}</strong> aguardando revisão</span></div>
      </div>

      {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role="status">
        {feedback.startsWith('Não foi') ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{feedback}
      </div>}

      <section className="admin-users-card admin-pending-nicknames-card" aria-busy={loading}>
        <div className="admin-nickname-toolbar">
          <label>
            <span className="sr-only">Buscar apelidos pendentes</span>
            <Search size={17} aria-hidden="true" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Buscar por nome, e-mail ou apelido" />
          </label>
          <span>{loading ? 'Carregando...' : `${result.total} resultado${result.total === 1 ? '' : 's'}`}</span>
        </div>
        {result.items.length === 0 && !loading ? <p className="admin-users-empty">{search ? 'Nenhum apelido pendente corresponde à busca.' : 'Não há apelidos aguardando revisão.'}</p> : (
          <div className="admin-pending-nicknames-table-wrap">
            <table className="admin-pending-nicknames-table">
              <thead><tr><th>Apelido solicitado</th><th>Participante</th><th>E-mail</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>{result.items.map((usuario) => <tr key={usuario.id}>
                <td data-label="Apelido solicitado"><strong>{usuario.nickname_pending}</strong></td>
                <td data-label="Participante">{usuario.name}</td>
                <td data-label="E-mail">{usuario.email}</td>
                <td data-label="Ações"><div className="admin-nickname-actions">
                  <AppButton size="sm" icon={<Check size={14} />} disabled={reviewing === usuario.id} onClick={() => void revisar(usuario.id, true)}>Aprovar</AppButton>
                  <AppButton variant="ghost" size="sm" icon={<X size={14} />} disabled={reviewing === usuario.id} onClick={() => void revisar(usuario.id, false)}>Recusar</AppButton>
                </div></td>
              </tr>)}</tbody>
            </table>
          </div>
        )}
        {result.totalPages > 1 && <nav className="admin-table-pagination" aria-label="Paginação de apelidos pendentes">
          <AppButton variant="ghost" size="sm" disabled={page === 1 || loading} onClick={() => setPage((current) => current - 1)}>Anterior</AppButton>
          <span>Página {page} de {pageCount}</span>
          <AppButton variant="ghost" size="sm" disabled={page >= pageCount || loading} onClick={() => setPage((current) => current + 1)}>Próxima</AppButton>
        </nav>}
      </section>
    </div>
  );
}
