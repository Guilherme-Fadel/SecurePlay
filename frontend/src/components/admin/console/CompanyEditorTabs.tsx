import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { ArrowLeft, RotateCcw } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { useAdminUnsavedChanges } from '@/hooks/useAdminUnsavedChanges';
import { adminQueryKey } from '@/lib/adminCache';
import { DEFAULT_PALETTES } from '@/lib/defaultPalettes';
import { optimizeImageUpload } from '@/lib/optimizeImageUpload';
import { getTema, getCompanyParameters, updateCompanySettings, presignLogo, type TemaEmpresa } from '@/services/admin';
import type { CompanyParameters } from '@/config/features';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AdminPageHeader } from '../AdminListLayout';
import { CompanyParametersTab } from '../CompanyParametersTab';
import { AdminRecordCard } from './AdminRecordCard';
import { AdminFeedback } from './AdminFeedback';
import { CompanyAppearanceFields } from './CompanyAppearanceFields';
import { companyEditorPath, companyEditorTabs, resolveCompanyEditorTab, type CompanyEditorTab } from './companyEditorNavigation';

type Draft = { nome: string; paleta: NonNullable<TemaEmpresa['paleta']>; logo_url: string | null; parametros: CompanyParameters };
function toDraft(theme: TemaEmpresa, parameters: CompanyParameters): Draft {
  return { nome: theme.nome, paleta: theme.paleta ?? DEFAULT_PALETTES[0].paleta, logo_url: theme.logo_url, parametros: parameters };
}

export function CompanyEditorTabs({ empresaId, fallbackTab }: { empresaId: number; fallbackTab: CompanyEditorTab }) {
  const location = useLocation();
  const { user } = useCurrentUser();
  const tab = resolveCompanyEditorTab(location.search, fallbackTab);
  const query = useCachedQuery(adminQueryKey('theme', empresaId, { editor: 'all-settings' }), async () => {
    const [theme, parameters] = await Promise.all([getTema(empresaId), getCompanyParameters(empresaId)]);
    return { theme, parameters };
  });
  const [draft, setDraft] = useState<Draft | null>(null);
  const [baseline, setBaseline] = useState<Draft | null>(null);
  const [theme, setTheme] = useState<TemaEmpresa | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [failedPreview, setFailedPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);
  const objectUrl = useRef<string | null>(null);
  const dirty = Boolean(draft && baseline && JSON.stringify(draft) !== JSON.stringify(baseline));
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const busy = saving || uploading;
  const releasePreview = () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); objectUrl.current = null; };
  useEffect(() => () => { if (objectUrl.current) URL.revokeObjectURL(objectUrl.current); }, []);
  useEffect(() => {
    if (!query.data || dirtyRef.current) return;
    const next = toDraft(query.data.theme, query.data.parameters);
    setTheme(query.data.theme); setDraft(next); setBaseline(next); setLogoPreview(query.data.theme.logo_preview_url); setFailedPreview(null);
  }, [query.data]);
  const save = async () => {
    if (!draft || !dirty || busy) return false;
    if (draft.nome.trim().length < 2 || draft.nome.trim().length > 100) {
      setFeedback({ text: 'Informe um nome entre 2 e 100 caracteres na aba Dados cadastrais.', error: true }); return false;
    }
    setSaving(true); setFeedback(null);
    try {
      const result = await updateCompanySettings(empresaId, { ...draft, nome: draft.nome.trim() });
      const next = toDraft(result.tema, result.parametros);
      setDraft(next); setBaseline(next); setTheme(result.tema); setLogoPreview(result.tema.logo_preview_url); setFailedPreview(null); releasePreview();
      setFeedback({ text: 'Dados cadastrais, aparência e funcionalidades salvos.' }); return true;
    } catch { setFeedback({ text: 'Não foi possível salvar a empresa. As alterações das três abas foram preservadas.', error: true }); return false; }
    finally { setSaving(false); }
  };
  const reset = () => {
    if (!baseline || busy) return;
    setDraft(baseline); setLogoPreview(theme?.logo_preview_url ?? null); setFailedPreview(null); releasePreview(); setFeedback(null);
  };
  const { prompt } = useAdminUnsavedChanges(dirty || uploading, save, busy,
    next => next.pathname === companyEditorPath(empresaId, 'data'));
  const uploadLogo = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file || busy || !draft) return;
    if (!['image/png', 'image/webp', 'image/jpeg'].includes(file.type) || file.size > 2 * 1024 * 1024) {
      setFeedback({ text: 'Use PNG, WEBP ou JPEG de até 2 MB.', error: true }); return;
    }
    setUploading(true); setFeedback(null);
    let preview: string | null = null;
    try {
      const optimized = await optimizeImageUpload(file, { maxWidth: 1024, maxHeight: 512 });
      preview = URL.createObjectURL(optimized);
      const { uploadUrl, fields, key } = await presignLogo(optimized.type, empresaId);
      const form = new FormData(); Object.entries(fields).forEach(([field, value]) => form.append(field, value)); form.append('file', optimized);
      if (!(await fetch(uploadUrl, { method: 'POST', body: form })).ok) throw new Error('upload failed');
      releasePreview(); objectUrl.current = preview; setLogoPreview(preview); preview = null;
      setDraft(current => current ? { ...current, logo_url: key } : current); setFailedPreview(null);
      setFeedback({ text: 'Logo enviado. Clique em Salvar para aplicar as alterações da empresa.' });
    } catch { setFeedback({ text: 'Não foi possível enviar o logo.', error: true }); }
    finally { if (preview) URL.revokeObjectURL(preview); setUploading(false); }
  };
  const returnTo = typeof location.state?.returnTo === 'string' && (location.state.returnTo === '/admin/empresas' || location.state.returnTo.startsWith('/admin/empresas?')) ? location.state.returnTo : '/admin/empresas';
  return <>{prompt}<section className="admin-company-editor" aria-busy={busy || query.loading}>
    <header className="admin-company-editor-heading">
      <h2>{theme?.nome ?? `Empresa #${empresaId}`}</h2>
      <div className="admin-company-editor-actions">
        <Link className="admin-console-back-link" to={returnTo} state={{ selectedId: empresaId }}><ArrowLeft size={16} /> Voltar</Link>
        <AppButton variant="ghost" icon={<RotateCcw size={15} />} disabled={!dirty || busy} onClick={reset}>Restaurar</AppButton>
        <AppButton disabled={!dirty || busy || query.loading} onClick={() => void save()}>{saving ? 'Salvando…' : uploading ? 'Enviando…' : 'Salvar'}</AppButton>
      </div>
    </header>
    <nav className="admin-company-editor-tabs" aria-label="Seções do cadastro da empresa">
      {companyEditorTabs.map(item => <Link key={item.id} to={companyEditorPath(empresaId, item.id)} state={{ ...location.state, returnTo }} aria-current={tab === item.id ? 'page' : undefined} aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }}>{item.label}</Link>)}
    </nav>
    {feedback && <AdminFeedback variant={feedback.error ? 'error' : 'success'}>{feedback.text}</AdminFeedback>}
    {!draft ? query.error ? <AdminFeedback variant="error">Não foi possível carregar a empresa. <button type="button" onClick={query.refetch}>Tentar novamente</button></AdminFeedback> : <p role="status">Carregando empresa…</p> : <>
      {tab === 'data' && <section><AdminPageHeader title="Dados cadastrais" description="Consulte e atualize os dados cadastrais desta empresa." /><AdminRecordCard><div className="admin-record-fields">
        <label className="admin-console-setting-field"><span>Nome da empresa</span><AppInput autoComplete="organization" required minLength={2} maxLength={100} value={draft.nome} disabled={busy} onChange={event => setDraft({ ...draft, nome: event.target.value })} /></label>
        <label className="admin-console-setting-field"><span>Código</span><AppInput value={empresaId} readOnly /></label>
      </div></AdminRecordCard></section>}
      {tab === 'appearance' && <section className="admin-console-settings"><AdminPageHeader title="Aparência" description="Personalize o logo e as cores da experiência da empresa." /><CompanyAppearanceFields theme={theme} palette={draft.paleta} setPalette={update => setDraft(current => current ? { ...current, paleta: typeof update === 'function' ? update(current.paleta) : update } : current)} logoKey={draft.logo_url} logoPreview={logoPreview} failedPreview={failedPreview} setFailedPreview={setFailedPreview} saving={saving} uploading={uploading} uploadLogo={uploadLogo} removeLogo={() => { setDraft({ ...draft, logo_url: null }); setLogoPreview(null); releasePreview(); }} user={user} /></section>}
      {tab === 'features' && <section className="admin-console-settings"><CompanyParametersTab parameters={draft.parametros} setParameters={parametros => setDraft({ ...draft, parametros })} canEdit={!busy} saving={busy} /></section>}
    </>}
  </section></>;
}
