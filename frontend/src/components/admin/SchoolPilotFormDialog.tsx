import { adminQueryKey } from '@/lib/adminCache';
import { AdminRecordCard } from './console/AdminRecordCard';
import { AdminFeedback } from './console/AdminFeedback';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { buscarContatosDePilotos } from '@/services/admin';
import { useState, useRef } from 'react';
import { useEffect, type FormEventHandler, type RefObject, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import type { SchoolPilotContact, SchoolPilotStatus } from '@/services/admin';

export type PilotForm = {
  objective: string;
  status: SchoolPilotStatus;
  contactAdminUserId: string;
  startDate: string;
  agreedEndDate: string;
  nextWeeklyMeetingAt: string;
  nextAction: string;
  nextActionAt: string;
};

export const EMPTY_PILOT_FORM: PilotForm = {
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

type Props = {
  inline?: boolean;
  empresaId?: number;
  companyField?: ReactNode;
  dialogRef: RefObject<HTMLDialogElement | null>;
  formRef: RefObject<HTMLFormElement | null>;
  selectedId: number | null;
  dialogOpen: boolean;
  form: PilotForm;
  contacts: SchoolPilotContact[];
  existingContactId: number | null;
  saving: boolean;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: FormEventHandler<HTMLFormElement>;
  onUpdate: <K extends keyof PilotForm>(field: K, value: PilotForm[K]) => void;
  onDialogClose: () => void;
};

function focusPilotObjective(form: HTMLFormElement | null) {
  window.requestAnimationFrame(() => {
    form?.querySelector<HTMLInputElement>('[name="objective"]')?.focus();
  });
}

export function SchoolPilotFormDialog({
  inline = false, empresaId, companyField,
  dialogRef, formRef, selectedId, dialogOpen, form, contacts, existingContactId,
  saving, loading, error, onClose, onSubmit, onUpdate, onDialogClose,
}: Props) {
  useEffect(() => {
    if (dialogOpen && (inline || dialogRef.current?.open)) focusPilotObjective(formRef.current);
  }, [dialogOpen, inline, selectedId, dialogRef, formRef]);

  const [contactSearch, setContactSearch] = useState('');
  const [contactPage, setContactPage] = useState(1);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(contactSearch); setContactPage(1); }, 300); return () => clearTimeout(timer); }, [contactSearch]);
  const contactQuery = useCachedQuery(adminQueryKey('users', empresaId, { purpose: 'pilot-contacts', search: debouncedSearch, page: contactPage }), () => buscarContatosDePilotos(empresaId ?? 0, debouncedSearch, contactPage), { enabled: Boolean(empresaId && dialogOpen) });
  const selectedContact = useRef<SchoolPilotContact | null>(null);
  const currentContact = [...contacts, ...(contactQuery.data?.items ?? [])].find(contact => String(contact.id) === form.contactAdminUserId);
  if (currentContact) selectedContact.current = currentContact;
  if (!form.contactAdminUserId || (selectedContact.current && String(selectedContact.current.id) !== form.contactAdminUserId)) selectedContact.current = null;
  const availableContacts = [...new Map([...contacts, ...(selectedContact.current ? [selectedContact.current] : []), ...(contactQuery.data?.items ?? [])].map(contact => [contact.id, contact])).values()];
  const Card = inline ? AdminRecordCard : 'section';
  const content = (
    <Card className={`school-pilot-dialog-card${inline ? ' school-pilot-page-card' : ''}`}>
        {!inline && <header className="school-pilot-dialog-header">
          <div>
            <h2 id="school-pilot-dialog-title">{selectedId ? 'Editar piloto' : 'Novo piloto'}</h2>
            <p>Registre apenas os combinados operacionais com a escola. A ficha não altera acessos nem ativa cobranças.</p>
          </div>
          <button type="button" className="school-pilot-dialog-close" onClick={onClose} aria-label="Fechar formulário"><X size={20} /></button>
        </header>}
        {inline && <p className="school-pilot-page-note">Registre os combinados operacionais com a escola. A ficha preserva os acessos e as funcionalidades existentes.</p>}
        <form id={inline ? "admin-console-pilot-form" : undefined} ref={formRef as RefObject<HTMLFormElement>} className="school-pilot-form" onSubmit={onSubmit}>
          {error && <AdminFeedback variant="error">{error}</AdminFeedback>}
          {companyField}
          <label className="school-pilot-field school-pilot-field-wide">
            <span>Objetivo do piloto</span>
            <AppInput name="objective" value={form.objective} onChange={(event) => onUpdate('objective', event.target.value)} minLength={3} maxLength={500} required disabled={saving} placeholder="Ex.: acompanhar a primeira aula com a turma" />
          </label>
          <div className="school-pilot-field">
            <span>Contato administrador da escola</span>
            {empresaId && <><AppInput aria-label="Buscar contato administrador" placeholder="Buscar contato por nome ou e-mail" value={contactSearch} onChange={event => setContactSearch(event.target.value)} disabled={saving} />
              {contactQuery.error && <AdminFeedback variant="error">Não foi possível buscar contatos. <button type="button" onClick={contactQuery.refetch}>Tentar novamente</button></AdminFeedback>}
            </>}
            <AppSelect aria-label="Contato administrador da escola" value={form.contactAdminUserId} onChange={(event) => onUpdate('contactAdminUserId', event.target.value)} disabled={saving}>
              <option value="">Sem contato vinculado</option>
              {availableContacts.map((contact) => <option key={contact.id} value={contact.id} disabled={!contact.active && contact.id !== existingContactId}>{`${contact.name}${contact.email ? ` · ${contact.email}` : ''}${contact.active ? '' : ' · inativo'}`}</option>)}
            </AppSelect>
          {empresaId && (contactQuery.data?.totalPages ?? 0) > 1 && <div className="admin-pilot-contact-pagination"><AppButton type="button" variant="secondary" disabled={saving || contactQuery.loading || contactPage === 1} onClick={() => setContactPage(p => p - 1)}>Contatos anteriores</AppButton><AppButton type="button" variant="secondary" disabled={saving || contactQuery.loading || contactPage >= (contactQuery.data?.totalPages ?? 0)} onClick={() => setContactPage(p => p + 1)}>Mais contatos</AppButton><small>Página {contactPage} de {contactQuery.data?.totalPages}</small></div>}
          </div>
          <label className="school-pilot-field">
            <span>Estado operacional</span>
            <AppSelect aria-label="Estado operacional" value={form.status} onChange={(event) => onUpdate('status', event.target.value as SchoolPilotStatus)} disabled={saving}>
              {Object.entries(STATUS_LABELS).map(([status, label]) => <option key={status} value={status}>{label}</option>)}
            </AppSelect>
          </label>
          <label className="school-pilot-field">
            <span>Início combinado</span>
            <input className="app-text-input" type="date" value={form.startDate} onChange={(event) => onUpdate('startDate', event.target.value)} disabled={saving} />
          </label>
          <label className="school-pilot-field">
            <span>Encerramento combinado</span>
            <input className="app-text-input" type="date" value={form.agreedEndDate} onChange={(event) => onUpdate('agreedEndDate', event.target.value)} disabled={saving} />
          </label>
          <label className="school-pilot-field">
            <span>Próxima reunião semanal</span>
            <input className="app-text-input" type="datetime-local" value={form.nextWeeklyMeetingAt} onChange={(event) => onUpdate('nextWeeklyMeetingAt', event.target.value)} disabled={saving} />
          </label>
          <label className="school-pilot-field">
            <span>Data da próxima ação (opcional)</span>
            <input className="app-text-input" type="datetime-local" value={form.nextActionAt} onChange={(event) => onUpdate('nextActionAt', event.target.value)} disabled={saving} />
          </label>
          <label className="school-pilot-field school-pilot-field-wide">
            <span>Próxima ação (opcional)</span>
            <AppInput value={form.nextAction} onChange={(event) => onUpdate('nextAction', event.target.value)} maxLength={500} disabled={saving} placeholder="Ex.: revisar o acesso do administrador" />
          </label>
          {!inline && <div className="school-pilot-form-actions">
            <AppButton type="button" variant="secondary" onClick={onClose} disabled={saving}>Cancelar</AppButton>
            <AppButton type="submit" disabled={saving || loading}>{saving ? 'Salvando...' : 'Salvar ficha'}</AppButton>
          </div>}
        </form>
      </Card>
  );

  if (inline) return <div className="school-pilot-page-editor">{content}</div>;

  return (
    <dialog ref={dialogRef as RefObject<HTMLDialogElement>} className="school-pilot-dialog" aria-labelledby="school-pilot-dialog-title" onClose={onDialogClose} onClick={(event) => { if (event.target === dialogRef.current) onClose(); }}>
      {content}
    </dialog>
  );
}
