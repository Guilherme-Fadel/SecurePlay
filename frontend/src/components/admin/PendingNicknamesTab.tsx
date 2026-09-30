import { useDeferredValue, useEffect, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Search, X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import { useCurrentUser } from '@/hooks/useCurrentUser';
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
  const { user } = useCurrentUser();
  const sessionKey = `secureplay-admin-nicknames:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<'default' | 'asc' | 'desc'>('default');
  const deferredSearch = useDeferredValue(search);
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(emptyResult);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [reviewing, setReviewing] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      const state = saved ? JSON.parse(saved) as { search?: string; sort?: 'default' | 'asc' | 'desc'; page?: number } : {};
      setSearch(state.search ?? '');
      setSort(state.sort === 'asc' || state.sort === 'desc' ? state.sort : 'default');
      setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
    } catch {
      setSearch(''); setSort('default'); setPage(1);
    }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, sort, page })); } catch { /* Optional session preference. */ }
  }, [page, restoredKey, search, sessionKey, sort]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void listarApelidosPendentes({ page, search: deferredSearch, sort }, empresaId)
      .then((next) => {
        if (cancelled) return;
        if (page > Math.max(1, next.totalPages)) { setPage(Math.max(1, next.totalPages)); return; }
        setResult(next);
      })
      .catch(() => {
        if (!cancelled) { setLoadError(true); setFeedback('Não foi possível carregar os apelidos pendentes.'); }
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, empresaId, page, reload, restoredKey, search, sessionKey, sort]);

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
      setReload((current) => current + 1);
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

      {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role={feedback.startsWith('Não foi') ? 'alert' : 'status'}>
        {feedback.startsWith('Não foi') ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}{feedback}{loadError && <AppButton variant="ghost" size="sm" onClick={() => setReload((current) => current + 1)}>Tentar novamente</AppButton>}
      </div>}

      <section className="admin-users-card admin-pending-nicknames-card" aria-busy={loading}>
        <div className="admin-nickname-toolbar">
          <label>
            <span className="sr-only">Buscar apelidos pendentes</span>
            <Search size={17} aria-hidden="true" />
            <input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por nome, e-mail ou apelido" />
          </label>
          <select aria-label="Ordenar apelidos pendentes" value={sort} onChange={(event) => { setSort(event.target.value as 'default' | 'asc' | 'desc'); setPage(1); }}>
            <option value="default">Ordem padrão</option>
            <option value="asc">Apelido A–Z</option>
            <option value="desc">Apelido Z–A</option>
          </select>
          <span>{loading ? 'Carregando...' : `${result.total} resultado${result.total === 1 ? '' : 's'}`}</span>
        </div>
        {loading && <p className="admin-users-empty" role="status">Carregando apelidos...</p>}
        {result.items.length === 0 && !loading && !loadError ? <p className="admin-users-empty">{search ? 'Nenhum apelido pendente corresponde à busca.' : 'Não há apelidos aguardando revisão.'}</p> : result.items.length > 0 && (
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
