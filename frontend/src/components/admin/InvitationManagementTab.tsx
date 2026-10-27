import { AdminRecordCard } from './console/AdminRecordCard';
import { PlatformCompanyFilter } from './console/PlatformCompanyFilter';
import { AdminFeedback } from './console/AdminFeedback';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Link2, Plus, QrCode, Trash2 } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AdminCardHeading, AdminPagination, AdminPageHeader, AdminListToolbar } from '@/components/admin/AdminListLayout';
import { criarConvite, listarConvites, revogarConvite, type ConvitesPaginados } from '@/services/convites';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { AdminGridPagination } from '@/components/admin/console/AdminGridPagination';
import { normalizeAdminListFilters } from '@/hooks/useAdminListFilters';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';

interface InvitationManagementTabProps {
  empresaId?: number;
  selectCompany?: boolean;
  podeCriarAdministrador?: boolean;
  mode?: 'combined' | 'list' | 'new';
  consoleMode?: boolean;
  headerActions?: ReactNode;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
}

export function InvitationManagementTab({ empresaId: initialCompanyId, selectCompany = false, podeCriarAdministrador = false, mode = 'combined', consoleMode = false, headerActions }: InvitationManagementTabProps) {
  const { user } = useCurrentUser();
  const canSelectCompany = selectCompany && user?.role === 'platform_admin' && mode === 'new';
  const [selectedCompanyId, setSelectedCompanyId] = useState(initialCompanyId);
  const empresaId = canSelectCompany ? selectedCompanyId : initialCompanyId;
  const notebook = useNotebookLayout();
  const [recordsPerPage, setRecordsPerPage] = useState(25);
  const pageSize = consoleMode ? recordsPerPage : notebook ? 3 : 25;
  const sessionKey = `secureplay-admin-invitations:${user?.userId ?? 'unknown'}:${empresaId ?? 'company'}`;
  const emptyResult: ConvitesPaginados = { items: [], page: 1, pageSize: 25, total: 0, totalPages: 0 };

  const [search, setSearch] = useState('');
  const deferredSearch = useDeferredValue(search);
  const [sort, setSort] = useState<'asc' | 'desc'>('desc');
  const [page, setPage] = useState(1);



  const [email, setEmail] = useState('');
  const [validade, setValidade] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [administrador, setAdministrador] = useState(false);
  const [registrationMode, setRegistrationMode] = useState<'legacy_email' | 'school_student'>('school_student');
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [conviteCopiado, setConviteCopiado] = useState(false);
  const FormCard = consoleMode ? AdminRecordCard : 'section';
  const [feedback, setFeedback] = useState<string | null>(null);
  const [feedbackError, setFeedbackError] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const { prompt: unsavedPrompt } = useAdminUnsavedChanges(consoleMode && mode === 'new' && (creating || (canSelectCompany && selectedCompanyId !== initialCompanyId) || Boolean(email.trim() || (linkGerado && !conviteCopiado)) || validade !== 7 || maxUses !== 1 || administrador || registrationMode !== 'school_student'), undefined, creating);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(sessionKey);
      const state = saved ? JSON.parse(saved) as { search?: string; sort?: 'asc' | 'desc'; page?: number; pageSize?: number } : {};
      setRecordsPerPage(normalizeAdminListFilters({ pageSize: state.pageSize }).pageSize);
      setSearch(state.search ?? '');
      setSort(state.sort === 'asc' ? 'asc' : 'desc');
      setPage(typeof state.page === 'number' && Number.isInteger(state.page) && state.page > 0 ? state.page : 1);
    } catch { setSearch(''); setSort('desc'); setPage(1); setRecordsPerPage(25); }
    setRestoredKey(sessionKey);
  }, [sessionKey]);

  useEffect(() => {
    if (restoredKey !== sessionKey || deferredSearch !== search) return;
    try { sessionStorage.setItem(sessionKey, JSON.stringify({ search, sort, page, pageSize: recordsPerPage })); } catch { /* Optional session preference. */ }
  }, [page, recordsPerPage, restoredKey, search, sessionKey, sort]);

  const fecharConvite = () => {
    if (dialogRef.current?.open) {
      dialogRef.current.close();
      return;
    }
    setLinkGerado(null);
    setConviteCopiado(false);
    requestAnimationFrame(() => openerRef.current?.focus());
  };

  useEffect(() => {
    if (!linkGerado) return;
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();
  }, [linkGerado]);

  const filters = { page, pageSize, search: deferredSearch, sort };
  const query = useCachedQuery(adminQueryKey('invitations', empresaId, filters), () => listarConvites(filters, empresaId), { enabled: mode !== 'new' && restoredKey === sessionKey });
  const result = query.data ?? emptyResult;
  const loading = query.loading;
  const loadError = Boolean(query.error);

  const criar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (creating) return;
    if (user?.role === 'platform_admin' && !empresaId) {
      setFeedbackError(true); setFeedback('Selecione a empresa do convite.'); return;
    }
    setCreating(true);
    setFeedbackError(false);
    setConviteCopiado(false);
    try {
      const modo = administrador ? 'legacy_email' : registrationMode;
      const result = await criarConvite({ email: modo === 'legacy_email' ? (email.trim() || undefined) : undefined, validade_dias: validade, max_uses: modo === 'school_student' ? 1 : maxUses, administrador: podeCriarAdministrador && administrador, registration_mode: modo }, empresaId);
      openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      setLinkGerado(`${window.location.origin}/cadastro#${result.token}`);
      setPage(1);
      setSearch('');
      setSort('desc');

      setEmail('');
      setValidade(7);
      setMaxUses(1);
      setRegistrationMode('school_student');
      setAdministrador(false);
      setFeedback(administrador ? 'Convite de administrador criado com sucesso.' : 'Convite criado com sucesso. Compartilhe o link ou QR code.');
    } catch (error: any) {
      setFeedbackError(true);
      setFeedback(error.response?.data?.message ?? 'Não foi possível criar o convite.');
    } finally { setCreating(false); }
  };

  const revogar = async (id: number) => {
    if (!window.confirm('Revogar este convite? O link deixará de permitir novos cadastros.')) return;
    setRevoking(id);
    setFeedbackError(false);
    try {
      await revogarConvite(id, empresaId);
      setFeedback('Convite revogado. O link não pode mais ser utilizado.');
    } catch { setFeedbackError(true); setFeedback('Não foi possível revogar o convite.'); }
    finally { setRevoking(null); }
  };

  const copiar = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setConviteCopiado(true);
    setFeedbackError(false);
    setFeedback('Link copiado para a área de transferência.');
  };
  const ativos = useMemo(() => result.items.filter((convite) => convite.status === 'ativo').length, [result.items]);
  const columns: AdminDataGridColumn<ConvitesPaginados['items'][number]>[] = [
    { key: 'recipient', label: 'Destinatário', render: (convite) => <><strong>{convite.email ?? (convite.registration_mode === 'school_student' ? 'Convite escolar individual' : 'Link aberto para a empresa')}{convite.role === 'admin' ? ' · Administrador' : ''}</strong><small>Expira em {formatDate(convite.expires_at)} · {convite.uses}/{convite.max_uses} usos</small></> },
    { key: 'status', label: 'Status', render: (convite) => <span className={`admin-invite-status is-${convite.status}`}>{convite.status}</span> },
    { key: 'actions', label: 'Revogar', className: 'admin-grid-icon-column', render: (convite) => convite.status !== 'revogado' ? <button type="button" className="admin-grid-icon-action" aria-label={`Revogar convite ${convite.id}`} title="Revogar convite" disabled={revoking === convite.id} onClick={() => void revogar(convite.id)}><Trash2 size={16} aria-hidden="true" /></button> : null },
  ];

  return <>{unsavedPrompt}<div className="admin-users-content">
    <AdminPageHeader title={mode === 'new' ? 'Novo convite' : 'Convites'} description={mode === 'new' ? 'Emita um acesso dentro dos limites permitidos para esta empresa.' : 'Crie acessos com validade, acompanhe a utilização e revogue links quando necessário.'} count={mode === 'new' || loading || loadError ? undefined : ativos} countLabel="ativos nesta página" countIcon={<QrCode size={18} />} action={mode === 'list' ? undefined : headerActions || (consoleMode && mode === 'new') ? <>{headerActions}{consoleMode && mode === 'new' && <AppButton type="submit" form="admin-console-invitation-form" disabled={creating || (user?.role === 'platform_admin' && !empresaId)} icon={<Link2 size={16} />}>{creating ? 'Gerando…' : 'Gerar convite'}</AppButton>}</> : undefined} />
    {feedback && <AdminFeedback variant={feedbackError ? 'error' : 'success'}>{feedback}</AdminFeedback>}
    <div className={`admin-invites-workspace${mode === 'new' ? ' is-new-only' : mode === 'list' ? ' is-list-only' : ''}`}>
      {mode !== 'list' && <FormCard className={consoleMode ? 'admin-invite-form-card' : 'admin-users-card admin-invite-form-card'}>
        {!consoleMode && <AdminCardHeading title="Novo convite" description={administrador ? 'O responsável receberá acesso de administrador desta empresa.' : registrationMode === 'school_student' ? 'Acesso individual de aluno por usuário ou e-mail, sem data de nascimento.' : 'Cadastro por e-mail e confirmação.'} icon={<Plus size={19} />} />}
        <form id={consoleMode ? "admin-console-invitation-form" : undefined} onSubmit={criar} className="admin-invite-form">
          {canSelectCompany && <div className="admin-invite-company-field"><span>Empresa</span><PlatformCompanyFilter fieldLabel="Empresa do convite" empresaId={empresaId} onChange={id => { setSelectedCompanyId(id); setFeedback(null); }} allowAll={false} compact disabled={creating || Boolean(linkGerado)} /></div>}
          {!administrador && <label className="admin-invite-email-field"><span>Forma de cadastro</span><AppSelect aria-label="Forma de cadastro" value={registrationMode} onChange={(event) => { const next = event.target.value as 'legacy_email' | 'school_student'; setRegistrationMode(next); if (next === 'school_student') setMaxUses(1); }}><option value="school_student">Aluno por usuário ou e-mail</option><option value="legacy_email">Cadastro com e-mail</option></AppSelect></label>}
          {(administrador || registrationMode === 'legacy_email') && <label className="admin-invite-email-field">
            <span className="admin-invite-email-label">E-mail do {administrador ? 'administrador' : 'aluno'} {!administrador && <small>opcional</small>}</span>
            <AppInput type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={administrador ? 'admin@empresa.com' : 'aluno@empresa.com'} required={administrador} />
          </label>}
          {podeCriarAdministrador && <label className="admin-invite-admin-flag">
            <input type="checkbox" checked={administrador} onChange={(event) => { setAdministrador(event.target.checked); if (event.target.checked) setMaxUses(1); }} />
            <span className="settings-switch" aria-hidden="true"><i /></span>
            <span>Administrador</span>
          </label>}
          <div className="admin-invite-options"><label>Validade<AppSelect value={validade} onChange={(event) => setValidade(Number(event.target.value))}><option value={1}>1 dia</option><option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option></AppSelect></label><label>Usos permitidos<AppSelect value={registrationMode === 'school_student' || administrador ? 1 : maxUses} disabled={administrador || registrationMode === 'school_student'} onChange={(event) => setMaxUses(Number(event.target.value))}><option value={1}>1 uso</option>{!administrador && registrationMode === 'legacy_email' && <><option value={5}>5 usos</option><option value={20}>20 usos</option><option value={100}>100 usos</option></>}</AppSelect></label></div>
          {!consoleMode && <AppButton type="submit" disabled={creating || (user?.role === 'platform_admin' && !empresaId)} icon={<Link2 size={16} />}>{creating ? 'Gerando...' : 'Gerar convite'}</AppButton>}
        </form>
      </FormCard>}
      {mode !== 'new' && <AdminDataGrid className="admin-invites-card" columns={columns} rows={result.items} rowKey={(convite) => convite.id} loading={loading} error={loadError ? 'Não foi possível carregar os convites.' : undefined} onRetry={query.refetch} empty={deferredSearch ? 'Nenhum convite corresponde à busca.' : 'Nenhum convite criado ainda.'} toolbar={<AdminListToolbar actions={mode === 'list' ? headerActions : undefined}><AppSearchInput label="Buscar convites" value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Buscar por e-mail" /><AppSelect aria-label="Ordenar convites por data" value={sort} onChange={(event) => { setSort(event.target.value as 'asc' | 'desc'); setPage(1); }}><option value="desc">Mais recentes</option><option value="asc">Mais antigos</option></AppSelect>{!consoleMode && <span className="admin-invites-total" aria-label="Total de convites">{loading || loadError ? '—' : `${result.total} ${result.total === 1 ? 'convite' : 'convites'}`}</span>}</AdminListToolbar>} footer={!loading && !loadError ? consoleMode
        ? <AdminGridPagination page={page} pageSize={recordsPerPage} total={result.total} totalPages={result.totalPages} ariaLabel="Paginação de convites" onPageChange={setPage} onPageSizeChange={(size) => { setRecordsPerPage(size); setPage(1); }} />
        : <AdminPagination page={page} totalPages={result.totalPages} ariaLabel="Paginação de convites" disabled={loading} adjacentButtons onPageChange={setPage} /> : null} />}
    </div>
    {linkGerado && <dialog ref={dialogRef} className="admin-qr-modal" aria-labelledby="invite-dialog-title" onClose={() => { setLinkGerado(null); setConviteCopiado(false); requestAnimationFrame(() => openerRef.current?.focus()); }}><div className="admin-qr-card"><button ref={closeButtonRef} type="button" className="admin-qr-close" onClick={fecharConvite} aria-label="Fechar">×</button><div className="admin-qr-title"><QrCode size={20} /><div><strong id="invite-dialog-title">Convite pronto</strong><span>Compartilhe pelo link ou QR code.</span></div></div><div className="admin-qr-code"><QRCodeSVG value={linkGerado} size={172} level="M" includeMargin /></div><div className="admin-qr-link"><span>{linkGerado}</span><button type="button" onClick={() => void copiar(linkGerado)}><Copy size={15} /> Copiar</button></div></div></dialog>}
  </div></>;
}
