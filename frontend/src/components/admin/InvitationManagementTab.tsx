import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, CheckCircle2, Copy, Link2, Plus, QrCode, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AppInput } from '@/components/ui/forms/AppInput';
import { cn } from '@/lib/utils';
import { AdminListCard, AdminListContent, AdminListState, AdminPagination, AdminPageHeader, AdminListToolbar } from '@/components/admin/AdminListLayout';
import { criarConvite, listarConvites, revogarConvite, type ConvitesPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';

interface InvitationManagementTabProps {
  empresaId?: number;
  podeCriarAdministrador?: boolean;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
}

export function InvitationManagementTab({ empresaId, podeCriarAdministrador = false }: InvitationManagementTabProps) {
  const { user } = useCurrentUser();
  const sessionKey = `secureplay-admin-invitations:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const emptyResult: ConvitesPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };
  const [result, setResult] = useState(emptyResult);
  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reload, setReload] = useState(0);
  const [email, setEmail] = useState('');
  const [validade, setValidade] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [administrador, setAdministrador] = useState(false);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      const state = saved ? JSON.parse(saved) as { search?: string; sort?: 'asc' | 'desc'; page?: number } : {};
      setSearch(state.search ?? '');
      setSort(state.sort === 'asc' ? 'asc' : 'desc');
      setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
    } catch { setSearch(''); setSort('desc'); setPage(1); }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, sort, page })); } catch { /* Optional session preference. */ }
  }, [page, restoredKey, search, sessionKey, sort]);

  const fecharConvite = () => {
    setLinkGerado(null);
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  useEffect(() => {
    if (!linkGerado) return;
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') return fecharConvite();
      if (event.key !== 'Tab' || !dialogRef.current) return;
      const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'));
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [linkGerado]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    let cancelled = false;
    setLoading(true);
    setLoadError(false);
    void listarConvites({ page, pageSize: 25, search: deferredSearch, sort }, empresaId)
      .then((next) => { if (!cancelled) setResult(next); })
      .catch(() => { if (!cancelled) setLoadError(true); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [deferredSearch, empresaId, page, reload, restoredKey, search, sessionKey, sort]);

  const criar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const result = await criarConvite({ email: email.trim() || undefined, validade_dias: validade, max_uses: maxUses, administrador: podeCriarAdministrador && administrador }, empresaId);
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setLinkGerado(`${window.location.origin}/cadastro#${result.token}`);
      setPage(1);
      setSearch('');
      setSort('desc');
      setReload((current) => current + 1);
      setEmail('');
      setAdministrador(false);
      setFeedback(administrador ? 'Convite de administrador criado com sucesso.' : 'Convite criado com sucesso. Compartilhe o link ou QR code.');
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível criar o convite.');
    } finally { setCreating(false); }
  };

  const revogar = async (id: number) => {
    setRevoking(id);
    try {
      const updated = await revogarConvite(id, empresaId);
      setResult((current) => ({ ...current, items: current.items.map((convite) => convite.id === id ? updated : convite) }));
      setFeedback('Convite revogado. O link não pode mais ser utilizado.');
    } catch { setFeedback('Não foi possível revogar o convite.'); }
    finally { setRevoking(null); }
  };

  const copiar = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setFeedback('Link copiado para a área de transferência.');
  };
  const ativos = useMemo(() => result.items.filter((convite) => convite.status === 'ativo').length, [result.items]);

  return <div className="admin-users-content">
    <AdminPageHeader title="Convites" description="Crie acessos com validade, acompanhe a utilização e revogue links quando necessário." count={loading || loadError ? undefined : ativos} countLabel="ativos nesta página" countIcon={<QrCode size={18} />} />
    {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role="status"><span>{feedback.startsWith('Não foi') ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}</span>{feedback}</div>}
    <div className="admin-invites-workspace">
      <section className="admin-users-card admin-invite-form-card"><div className="admin-users-card-heading"><span className="admin-users-heading-icon"><Plus size={19} /></span><div><h2>Novo convite</h2><p>{administrador ? 'O responsável receberá acesso de administrador desta empresa.' : 'O aluno cria a própria senha pelo link seguro.'}</p></div></div><form onSubmit={criar} className="admin-invite-form"><label>E-mail do {administrador ? 'administrador' : 'aluno'} {!administrador && <small>opcional</small>}<AppInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={administrador ? 'admin@empresa.com' : 'aluno@empresa.com'} required={administrador} /></label>{podeCriarAdministrador && <label className="admin-invite-admin-flag"><input type="checkbox" checked={administrador} onChange={(event) => { setAdministrador(event.target.checked); if (event.target.checked) setMaxUses(1); }} /><span>Administrador</span></label>}<div className="admin-invite-options"><label>Validade<AppSelect value={validade} onChange={(event) => setValidade(Number(event.target.value))}><option value={1}>1 dia</option><option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option></AppSelect></label><label>Usos permitidos<AppSelect value={maxUses} disabled={administrador} onChange={(event) => setMaxUses(Number(event.target.value))}><option value={1}>1 uso</option>{!administrador && <><option value={5}>5 usos</option><option value={20}>20 usos</option><option value={100}>100 usos</option></>}</AppSelect></label></div><AppButton type="submit" disabled={creating} icon={<Link2 size={16} />}>{creating ? 'Gerando...' : 'Gerar convite'}</AppButton></form></section>
      <AdminListCard className="admin-invites-card" loading={loading}><div className="admin-users-card-heading"><span className="admin-users-heading-icon is-accent"><QrCode size={19} /></span><div><h2>Convites emitidos</h2><p>Links com expiração e uso controlado.</p></div></div><AdminListToolbar><AppSearchInput label="Buscar convites" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por e-mail" /><AppSelect aria-label="Ordenar convites por data" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></AppSelect></AdminListToolbar><AdminListContent className="admin-invites-table">{loadError ? <AdminListState kind="error" onRetry={() => setReload((current) => current + 1)}>Não foi possível carregar os convites.</AdminListState> : loading ? <AdminListState kind="loading">Carregando convites...</AdminListState> : result.items.length === 0 ? <AdminListState kind="empty">{deferredSearch ? 'Nenhum convite corresponde à busca.' : 'Nenhum convite criado ainda.'}</AdminListState> : result.items.map((convite) => <div key={convite.id} className="admin-invite-row"><div><strong>{convite.email ?? 'Link aberto para a empresa'}{convite.role === 'admin' ? ' · Administrador' : ''}</strong><small>Expira em {formatDate(convite.expires_at)} · {convite.uses}/{convite.max_uses} usos</small></div><span className={`admin-invite-status is-${convite.status}`}>{convite.status}</span>{convite.status === 'ativo' && <AppButton variant="ghost" size="sm" icon={<Trash2 size={14} />} disabled={revoking === convite.id} onClick={() => void revogar(convite.id)}>Revogar</AppButton>}</div>)}</AdminListContent>{!loading && !loadError && <AdminPagination page={page} totalPages={result.totalPages} ariaLabel="Paginação de convites" disabled={loading} detail={`${result.total} convites`} onPageChange={setPage} />}</AdminListCard>
    </div>
    {linkGerado && <div className="admin-qr-modal" role="dialog" aria-modal="true" aria-labelledby="invite-dialog-title"><div className="admin-qr-card" ref={dialogRef}><button ref={closeButtonRef} className="admin-qr-close" onClick={fecharConvite} aria-label="Fechar">×</button><div className="admin-qr-title"><QrCode size={20} /><div><strong id="invite-dialog-title">Convite pronto</strong><span>Compartilhe pelo link ou QR code.</span></div></div><div className="admin-qr-code"><QRCodeSVG value={linkGerado} size={172} level="M" includeMargin /></div><div className="admin-qr-link"><span>{linkGerado}</span><button onClick={() => void copiar(linkGerado)}><Copy size={15} /> Copiar</button></div></div></div>}
  </div>;
}
