import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { CalendarDays, Plus, Save } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
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
  type ResumoAdministrativo,
} from '@/services/convites';
import {
  AdminCardHeading,
  AdminListCard,
  AdminListState,
  AdminPageHeader,
} from '@/components/admin/AdminListLayout';

type PilotForm = {
  objective: string;
  status: SchoolPilotStatus;
  contactAdminUserId: string;
  startDate: string;
  agreedEndDate: string;
  nextWeeklyMeetingAt: string;
  nextAction: string;
  nextActionAt: string;
};

const EMPTY_FORM: PilotForm = {
  objective: '',
  status: 'planned',
  contactAdminUserId: '',
  startDate: '',
  agreedEndDate: '',
  nextWeeklyMeetingAt: '',
  nextAction: '',
  nextActionAt: '',
};

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
  const [summary, setSummary] = useState<ResumoAdministrativo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setSummary(null);
    if (!empresaId) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError(false);
    void obterResumoAdministrativo(empresaId)
      .then((result) => {
        if (!cancelled) setSummary(result);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId, attempt]);

  return (
    <section className="school-pilot-metrics" aria-label="Indicadores atuais da escola">
      <AdminCardHeading title="Indicadores atuais" description="Contagens agregadas da escola, sem identificação de alunos ou histórico de coorte." icon={<CalendarDays size={19} />} />
      {loading ? <AdminListState kind="loading">Carregando indicadores...</AdminListState>
        : error ? <AdminListState kind="error" onRetry={() => setAttempt((current) => current + 1)}>Não foi possível carregar os indicadores.</AdminListState>
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
    </section>
  );
}

export function SchoolPilotManagementTab({ empresaId, empresaNome }: { empresaId?: number; empresaNome?: string }) {
  const [items, setItems] = useState<SchoolPilot[]>([]);
  const [contacts, setContacts] = useState<Awaited<ReturnType<typeof listarPilotosDaEmpresa>>['contacts']>([]);
  const [form, setForm] = useState<PilotForm>(EMPTY_FORM);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setItems([]);
    setContacts([]);
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setFeedback(null);
  }, [empresaId]);

  useEffect(() => {
    let cancelled = false;
    if (!empresaId) {
      setLoading(false);
      return () => { cancelled = true; };
    }
    setLoading(true);
    setError(false);
    void listarPilotosDaEmpresa(empresaId)
      .then((result) => {
        if (cancelled) return;
        setItems(result.items);
        setContacts(result.contacts);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [empresaId, attempt]);

  const beginNew = () => {
    setSelectedId(null);
    setForm(EMPTY_FORM);
    setFeedback(null);
  };

  const edit = (pilot: SchoolPilot) => {
    setSelectedId(pilot.id);
    setForm(toForm(pilot));
    setFeedback(null);
  };

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!empresaId) return;
    setSaving(true);
    setFeedback(null);
    try {
      const saved = selectedId
        ? await atualizarPilotoDaEmpresa(empresaId, selectedId, toPayload(form))
        : await criarPilotoDaEmpresa(empresaId, toPayload(form));
      setSelectedId(saved.id);
      setFeedback('Ficha do piloto salva.');
      setAttempt((current) => current + 1);
    } catch {
      setFeedback('Não foi possível salvar a ficha. Confira os dados e tente novamente.');
    } finally {
      setSaving(false);
    }
  };

  const update = <K extends keyof PilotForm>(field: K, value: PilotForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };
  const existingContactId = selectedId
    ? items.find((pilot) => pilot.id === selectedId)?.contactAdminUserId
    : null;

  return (
    <div className="admin-users-content school-pilot-content">
      <AdminPageHeader
        title="Piloto da escola"
        description={`Acompanhe objetivo, contato adulto, datas e próximos passos${empresaNome ? ` de ${empresaNome}` : ''}. Esta ficha não altera o acesso ou as funcionalidades da escola.`}
        action={<AppButton variant="secondary" size="sm" onClick={beginNew}><Plus size={16} /> Novo piloto</AppButton>}
      />
      {feedback && <p className="school-pilot-feedback" role="status">{feedback}</p>}
      <SchoolPilotMetrics empresaId={empresaId} />
      <div className="school-pilot-grid">
        <AdminListCard loading={loading}>
          <AdminCardHeading title="Histórico de pilotos" description="Cada piloto é preservado como registro próprio, inclusive quando é concluído ou convertido." icon={<CalendarDays size={19} />} />
          {loading ? <AdminListState kind="loading">Carregando pilotos...</AdminListState>
            : error ? <AdminListState kind="error" onRetry={() => setAttempt((current) => current + 1)}>Não foi possível carregar os pilotos.</AdminListState>
              : items.length === 0 ? <AdminListState kind="empty">Ainda não há pilotos registrados para esta escola.</AdminListState>
                : <ul className="school-pilot-list">{items.map((pilot) => (
                  <li key={pilot.id}>
                    <button type="button" className="school-pilot-list-item" aria-current={selectedId === pilot.id ? 'true' : undefined} onClick={() => edit(pilot)}>
                      <span className={`school-pilot-status is-${pilot.status}`}>{STATUS_LABELS[pilot.status]}</span>
                      <strong>{pilot.objective}</strong>
                      <small>{formatDate(pilot.startDate)} – {formatDate(pilot.agreedEndDate)}</small>
                      <small>Próxima reunião: {formatDateTime(pilot.nextWeeklyMeetingAt)}</small>
                    </button>
                  </li>
                ))}</ul>}
        </AdminListCard>

        <AdminListCard>
          <AdminCardHeading title={selectedId ? 'Editar piloto' : 'Novo piloto'} description="Defina o acompanhamento combinado com a escola. Datas são específicas deste piloto e não ativam cobrança ou acesso automaticamente." icon={<CalendarDays size={19} />} />
          <form className="school-pilot-form" onSubmit={save}>
            <label className="school-pilot-field school-pilot-field-wide">
              <span>Objetivo do piloto</span>
              <AppInput value={form.objective} onChange={(event) => update('objective', event.target.value)} minLength={3} maxLength={500} required disabled={saving} placeholder="Ex.: acompanhar a primeira aula com a turma" />
            </label>
            <label className="school-pilot-field">
              <span>Contato administrador da escola</span>
              <AppSelect value={form.contactAdminUserId} onChange={(event) => update('contactAdminUserId', event.target.value)} disabled={saving}>
                <option value="">Sem contato vinculado</option>
                {contacts.map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.active && contact.id !== existingContactId}>{contact.name}{contact.email ? ` · ${contact.email}` : ''}{contact.active ? '' : ' · inativo'}</option>)}
              </AppSelect>
            </label>
            <label className="school-pilot-field">
              <span>Estado operacional</span>
              <AppSelect value={form.status} onChange={(event) => update('status', event.target.value as SchoolPilotStatus)} disabled={saving}>
                {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
              </AppSelect>
            </label>
            <label className="school-pilot-field">
              <span>Início combinado</span>
              <input className="app-text-input" type="date" value={form.startDate} onChange={(event) => update('startDate', event.target.value)} disabled={saving} />
            </label>
            <label className="school-pilot-field">
              <span>Encerramento combinado</span>
              <input className="app-text-input" type="date" value={form.agreedEndDate} onChange={(event) => update('agreedEndDate', event.target.value)} disabled={saving} />
            </label>
            <label className="school-pilot-field">
              <span>Próxima reunião semanal</span>
              <input className="app-text-input" type="datetime-local" value={form.nextWeeklyMeetingAt} onChange={(event) => update('nextWeeklyMeetingAt', event.target.value)} disabled={saving} />
            </label>
            <label className="school-pilot-field">
              <span>Data da próxima ação (opcional)</span>
              <input className="app-text-input" type="datetime-local" value={form.nextActionAt} onChange={(event) => update('nextActionAt', event.target.value)} disabled={saving} />
            </label>
            <label className="school-pilot-field school-pilot-field-wide">
              <span>Próxima ação (opcional)</span>
              <AppInput value={form.nextAction} onChange={(event) => update('nextAction', event.target.value)} maxLength={500} disabled={saving} placeholder="Ex.: revisar o acesso do administrador" />
            </label>
            <div className="school-pilot-form-actions">
              <AppButton type="submit" disabled={saving || loading}>{saving ? 'Salvando...' : <><Save size={16} /> Salvar ficha</>}</AppButton>
            </div>
          </form>
        </AdminListCard>
      </div>
    </div>
  );
}
