import { useEffect, useRef, useState } from 'react';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';
import { adminQueryKey } from '@/lib/adminCache';
import { getCompanyRegistration, registrationDraft, registrationChanges, companyError, type CompanyRegistrationDraft } from '@/services/companyRegistration';
import { updateCompanySettings } from '@/services/admin';
import { CompanyRegistrationFields } from '../CompanyRegistrationFields';
import { AdminPageHeader } from '../AdminListLayout';
import { AdminRecordCard } from './AdminRecordCard';
import { AdminFeedback } from './AdminFeedback';
import { AppButton } from '@/components/ui/buttons/AppButton';

type Draft = { nome: string; cadastro: CompanyRegistrationDraft };
export function CompanyDataPanel({ empresaId }: { empresaId?: number }) {
  const { user } = useCurrentUser();
  const canEdit = user?.role === 'platform_admin' && empresaId !== undefined;
  const query = useCachedQuery(adminQueryKey('registration', empresaId), () => getCompanyRegistration(empresaId));
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ text: string; error?: boolean } | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const dirty = canEdit && JSON.stringify(draft) !== JSON.stringify(baseline);
  const dirtyRef = useRef(dirty); dirtyRef.current = dirty;
  useEffect(() => {
    if (query.data && !dirtyRef.current) {
      const next = { nome: query.data.nome, cadastro: registrationDraft(query.data.cadastro) };
      setDraft(next); setBaseline(next);
    }
  }, [query.data]);
  const save = async () => {
    if (!draft || !baseline || !canEdit || !dirty || saving || query.error || !form.current?.reportValidity()) return false;
    setSaving(true); setMessage(null);
    try {
      const result = await updateCompanySettings(empresaId, { nome: draft.nome.trim(), cadastro: registrationChanges(draft.cadastro, baseline.cadastro) });
      const next = { nome: result.tema.nome, cadastro: registrationDraft(result.cadastro ?? draft.cadastro) };
      setDraft(next); setBaseline(next); setMessage({ text: 'Dados cadastrais atualizados.' }); return true;
    } catch (error) { setMessage({ text: companyError(error, 'Não foi possível salvar. Seu preenchimento foi preservado.'), error: true }); return false; }
    finally { setSaving(false); }
  };
  const { prompt } = useAdminUnsavedChanges(dirty, save, saving);
  return <>{prompt}<section className="admin-console-settings">
    <AdminPageHeader title="Dados da empresa" description={canEdit ? 'Atualize a identificação, o contato institucional e o endereço.' : 'Consulte os dados da sua instituição. Para correções, fale com a administração da plataforma.'} action={canEdit ? <>
      <AppButton variant="ghost" disabled={!dirty || saving || query.loading} onClick={() => { setDraft(baseline); setMessage(null); }}>Restaurar</AppButton>
      <AppButton disabled={!dirty || saving || query.loading || Boolean(query.error)} onClick={() => void save()}>{saving ? 'Salvando…' : 'Salvar'}</AppButton>
    </> : undefined} />
    {message && <AdminFeedback variant={message.error ? 'error' : 'success'}>{message.text}</AdminFeedback>}
    {query.error && <AdminFeedback variant="error">Não foi possível carregar os dados. <AppButton variant="ghost" size="sm" onClick={query.refetch}>Tentar novamente</AppButton></AdminFeedback>}
    {!draft ? !query.error && <p role="status">Carregando dados…</p> : <AdminRecordCard className="admin-company-registration-card" busy={saving}>
      {!query.data?.completo && <p className="company-registration-note">Este cadastro ainda tem informações não preenchidas. Os acessos existentes continuam disponíveis.</p>}
      <form ref={form} onSubmit={event => { event.preventDefault(); void save(); }}>
        <CompanyRegistrationFields nome={draft.nome} onNomeChange={nome => setDraft({ ...draft, nome })} value={draft.cadastro} onChange={cadastro => setDraft({ ...draft, cadastro })} readOnly={!canEdit} disabled={saving || Boolean(query.error)} empresaId={empresaId} />
      </form>
    </AdminRecordCard>}
  </section></>;
}
