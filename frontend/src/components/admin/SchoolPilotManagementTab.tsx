import type { ReactNode } from 'react';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import type { FormEvent } from 'react';
import { CalendarDays, Pencil, Plus } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { EMPTY_PILOT_FORM, SchoolPilotFormDialog, type PilotForm } from '@/components/admin/SchoolPilotFormDialog';
import {
  atualizarPilotoDaEmpresa,
  criarPilotoDaEmpresa,
  listarPilotosDaEmpresa,
  type SaveSchoolPilot,
  type SchoolPilot,
  type SchoolPilotStatus,
} from '@/services/admin';
import {
  obterResumoAdministrativo,
} from '@/services/convites';
import {
  AdminCardHeading,
  AdminListCard,
  AdminListState,
  AdminPageHeader,
  AdminPagination,
} from '@/components/admin/AdminListLayout';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';

const EMPTY_PILOTS: SchoolPilot[] = [];
const EMPTY_CONTACTS: Awaited<ReturnType<typeof listarPilotosDaEmpresa>>['contacts'] = [];

const STATUS_LABELS: Record<SchoolPilotStatus, string> = {
  planned: 'Planejado',
  active: 'Em andamento',
  paused: 'Pausado',
  completed: 'Concluído',
  converted: 'Convertido',
  cancelled: 'Cancelado',
};

function localDateTime(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (part: number) => String(part).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function toForm(pilot: SchoolPilot): PilotForm {
  return {
    objective: pilot.objective,
    status: pilot.status,
    contactAdminUserId: pilot.contactAdminUserId ? String(pilot.contactAdminUserId) : '',
    startDate: pilot.startDate ?? '',
    agreedEndDate: pilot.agreedEndDate ?? '',
    nextWeeklyMeetingAt: localDateTime(pilot.nextWeeklyMeetingAt),
    nextAction: pilot.nextAction ?? '',
    nextActionAt: localDateTime(pilot.nextActionAt),
  };
}

function toPayload(form: PilotForm): SaveSchoolPilot {
  return {
    objective: form.objective.trim(),
    status: form.status,
    contactAdminUserId: form.contactAdminUserId ? Number(form.contactAdminUserId) : null,
    startDate: form.startDate || null,
    agreedEndDate: form.agreedEndDate || null,
    nextWeeklyMeetingAt: form.nextWeeklyMeetingAt
      ? new Date(form.nextWeeklyMeetingAt).toISOString()
      : null,
    nextAction: form.nextAction.trim() || null,
    nextActionAt: form.nextActionAt
      ? new Date(form.nextActionAt).toISOString()
      : null,
  };
}

function formatDate(value: string | null) {
  if (!value) return 'Não definida';
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  return new Intl.DateTimeFormat('pt-BR').format(date);
}

function formatDateTime(value: string | null) {
  if (!value) return 'Não agendada';
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(value));
}

function SchoolPilotMetrics({ empresaId }: { empresaId?: number }) {
  const { data: summary, loading, error, refetch } = useCachedQuery(adminQueryKey('summary', empresaId), () => obterResumoAdministrativo(empresaId), { enabled: Boolean(empresaId) });

  return (
    <AdminListCard className="school-pilot-metrics" loading={loading}>
      <AdminCardHeading title="Indicadores atuais" description="Contagens agregadas da escola, sem identificação de alunos ou histórico de coorte." icon={<CalendarDays size={19} />} />
      {loading ? <AdminListState kind="loading">Carregando indicadores...</AdminListState>
        : error ? <AdminListState kind="error" onRetry={refetch}>Não foi possível carregar os indicadores.</AdminListState>
          : summary && <div className="admin-overview-grid">
            <section className="admin-overview-card" aria-label="Alunos ativos">
              <small>Alunos ativos</small>
              <strong>{summary.alunosAtivos}</strong>
              <p>Contas de aluno com acesso liberado agora.</p>
            </section>
            <section className="admin-overview-card" aria-label="Alunos com primeira participação">
              <small>Alunos com aula concluída</small>
              <strong>{summary.alunosComAulaConcluida}</strong>
              <p>Alunos ativos que concluíram ao menos uma aula.</p>
            </section>
          </div>}
    </AdminListCard>
  );
}

export function SchoolPilotManagementTab({ empresaId, empresaNome, headerActions }: { empresaId?: number; empresaNome?: string; headerActions?: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [form, setForm] = useState<PilotForm>(EMPTY_PILOT_FORM);
  const [baselineForm, setBaselineForm] = useState<PilotForm>(EMPTY_PILOT_FORM);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [saving, setSaving] = useState(false);

  const [feedback, setFeedback] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [page, setPage] = useState(1);
  const formRef = useRef<HTMLFormElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);

  useEffect(() => {


    setPage(1);
    setSelectedId(null);
    setForm(EMPTY_PILOT_FORM);
    setBaselineForm(EMPTY_PILOT_FORM);
    setFeedback(null);
    setFormError(null);
    dialogRef.current?.close();
    setDialogOpen(false);
  }, [empresaId]);

  const pilotsQuery = useCachedQuery(adminQueryKey('pilots', empresaId), () => empresaId ? listarPilotosDaEmpresa(empresaId) : Promise.reject(new Error('Empresa não selecionada')), { enabled: Boolean(empresaId) });
  const items = pilotsQuery.data?.items ?? EMPTY_PILOTS;
  const contacts = pilotsQuery.data?.contacts ?? EMPTY_CONTACTS;
  const loading = pilotsQuery.loading;
  const error = Boolean(pilotsQuery.error);
  const editorKey = useRef<string | null>(null);

  const basePath = location.pathname.replace(/\/(?:novo|\d+\/editar)\/?$/, '');
  const isEditRoute = /\/\d+\/editar\/?$/.test(location.pathname);
  const routePilotId = isEditRoute ? Number(location.pathname.match(/\/(\d+)\/editar\/?$/)?.[1]) : null;
  const inlineRoute = location.pathname.startsWith('/admin/empresas/')
    && location.pathname.includes('/operacao/pilotos/')
    && (/\/novo\/?$/.test(location.pathname) || /\/\d+\/editar\/?$/.test(location.pathname));
  const isDirty = Boolean(inlineRoute && dialogOpen && JSON.stringify(form) !== JSON.stringify(baselineForm));
  const editorRouteReady = !inlineRoute || (isEditRoute ? selectedId === routePilotId : selectedId === null);
  const beginNew = () => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; navigate(`${basePath}/novo`); };

  const edit = (pilot: SchoolPilot) => { openerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null; navigate(`${basePath}/${pilot.id}/editar`); };

  const closeDialog = () => {
    if (inlineRoute) {
      navigate(basePath);
      return;
    }
    dialogRef.current?.close();
  };

  const handleDialogClose = () => {
    setDialogOpen(false);
    openerRef.current?.focus();
    openerRef.current = null;
    if (location.pathname !== basePath) navigate(basePath, { replace: true });
  };

  useEffect(() => {
    if (loading || error || !pilotsQuery.data) return;
    const key = empresaId + ':' + location.pathname;
    if (editorKey.current === key) return;
    editorKey.current = key;
    if (/\/novo\/?$/.test(location.pathname)) {
      setSelectedId(null); setForm(EMPTY_PILOT_FORM); setBaselineForm(EMPTY_PILOT_FORM); setFeedback(null); setFormError(null); setDialogOpen(true);
      if (!inlineRoute) requestAnimationFrame(() => dialogRef.current?.showModal());
      return;
    }
    const match = location.pathname.match(/\/(\d+)\/editar\/?$/);
    if (!match) {
      dialogRef.current?.close();
      setDialogOpen(false);
      setSelectedId(null);
      setForm(EMPTY_PILOT_FORM);
      return;
    }
    const pilotId = Number(match[1]);
    const pilot = items.find((item) => item.id === pilotId);
    if (!pilot) { setFeedback('Este piloto não foi encontrado nesta empresa.'); navigate(basePath, { replace: true }); return; }
    const nextForm = toForm(pilot);
    setSelectedId(pilot.id); setForm(nextForm); setBaselineForm(nextForm); setFeedback(null); setFormError(null); setDialogOpen(true);
    if (!inlineRoute) requestAnimationFrame(() => dialogRef.current?.showModal());
  }, [basePath, empresaId, error, inlineRoute, items, loading, location.pathname, navigate, pilotsQuery.data]);

  const persistPilot = async (): Promise<boolean> => {
    if (saving || !empresaId || !formRef.current?.reportValidity()) return false;
    setSaving(true);
    setFeedback(null);
    setFormError(null);
    try {
      const saved = selectedId
        ? await atualizarPilotoDaEmpresa(empresaId, selectedId, toPayload(form))
        : await criarPilotoDaEmpresa(empresaId, toPayload(form));
      setSelectedId(saved.id);
      setBaselineForm(form);
      setFeedback('Ficha do piloto salva.');

      return true;
    } catch {
      setFormError('Não foi possível salvar a ficha. Confira os dados e tente novamente.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (await persistPilot()) {
      allowNextNavigation();
      closeDialog();
    }
  };
  const { prompt: unsavedPrompt, allowNextNavigation } = useAdminUnsavedChanges(isDirty, persistPilot, saving);

  const update = <K extends keyof PilotForm>(field: K, value: PilotForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const existingContactId = selectedId ? items.find((pilot) => pilot.id === selectedId)?.contactAdminUserId : null;
  const pageSize = 25;
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const pageItems = items.slice((page - 1) * pageSize, page * pageSize);
  const columns: AdminDataGridColumn<SchoolPilot>[] = [
    { key: 'objective', label: 'Objetivo', render: (pilot) => <><strong>{pilot.objective}</strong><small>{pilot.contactAdmin?.name ?? 'Sem contato vinculado'}</small></> },
    { key: 'status', label: 'Estado', render: (pilot) => <span className={`school-pilot-status is-${pilot.status}`}>{STATUS_LABELS[pilot.status]}</span> },
    { key: 'dates', label: 'Período', render: (pilot) => `${formatDate(pilot.startDate)} – ${formatDate(pilot.agreedEndDate)}` },
    { key: 'next', label: 'Próximo compromisso', render: (pilot) => <>{formatDateTime(pilot.nextWeeklyMeetingAt)}{pilot.nextAction && <small>{pilot.nextAction} · {formatDateTime(pilot.nextActionAt)}</small>}</> },
    { key: 'actions', label: 'Ações', render: (pilot) => <AppButton variant="secondary" size="sm" onClick={() => edit(pilot)} aria-label={`Editar piloto: ${pilot.objective}`}><Pencil size={15} /> Editar</AppButton> },
  ];

  return (
    <>{unsavedPrompt}<div className="admin-users-content school-pilot-content">
      <AdminPageHeader
        title={inlineRoute ? (isEditRoute ? 'Editar piloto' : 'Novo piloto') : 'Piloto da escola'}
        description={`Acompanhe objetivo, contato adulto, datas e próximos passos${empresaNome ? ` de ${empresaNome}` : ''}. Esta ficha não altera o acesso ou as funcionalidades da escola.`}
        action={inlineRoute ? <>{headerActions}<AppButton type="submit" form="admin-console-pilot-form" disabled={saving || loading || !editorRouteReady}>{saving ? 'Salvando…' : 'Salvar ficha'}</AppButton></> : <AppButton variant="secondary" size="sm" onClick={beginNew} icon={<Plus size={16} />}>Novo piloto</AppButton>}
      />
      {feedback && <p className="school-pilot-feedback" role="status">{feedback}</p>}
      {!inlineRoute && <>
        {location.pathname.startsWith('/admin/') ? <details className="admin-console-pilot-metrics"><summary>Indicadores da escola</summary><SchoolPilotMetrics empresaId={empresaId} /></details> : <SchoolPilotMetrics empresaId={empresaId} />}
        <AdminDataGrid columns={columns} rows={pageItems} rowKey={(pilot) => pilot.id} loading={loading} error={error ? 'Não foi possível carregar os pilotos.' : undefined} onRetry={pilotsQuery.refetch} empty="Ainda não há pilotos registrados para esta escola." className="admin-pilots-grid" toolbar={<AdminCardHeading title="Acompanhamento dos pilotos" description="A API retorna a coleção completa; a paginação desta lista é local." icon={<CalendarDays size={19} />} />} footer={!loading && !error ? <AdminPagination alwaysVisible={location.pathname.startsWith('/admin/')} page={page} totalPages={totalPages} ariaLabel="Paginação local de pilotos escolares" onPageChange={setPage} detail={`${items.length} pilotos`} /> : null} />
      </>}

      {inlineRoute && (!dialogOpen || !editorRouteReady) && (error
        ? <AdminListState kind="error" onRetry={pilotsQuery.refetch}>Não foi possível carregar os dados dos pilotos.</AdminListState>
        : <AdminListState kind="loading">Carregando os dados do piloto…</AdminListState>)}

      {(!inlineRoute || (dialogOpen && editorRouteReady)) && <SchoolPilotFormDialog
        inline={inlineRoute}
        dialogRef={dialogRef}
        formRef={formRef}
        selectedId={selectedId}
        dialogOpen={dialogOpen}
        form={form}
        contacts={contacts}
        existingContactId={existingContactId ?? null}
        saving={saving}
        loading={loading}
        error={formError}
        onClose={closeDialog}
        onSubmit={save}
        onUpdate={update}
        onDialogClose={handleDialogClose}
      />}
    </div></>
  );
}
