import { useEffect, useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { AppInput } from '@/components/ui/forms/AppInput';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { findCompanyCnpj, type CompanyRegistrationDraft, type RegistrationField } from '@/services/companyRegistration';
import './company-registration.css';

type Field = { key: RegistrationField | 'nome'; label: string; max: number; optional?: boolean; type?: 'email'; autoComplete?: string };
const groups: { title: string; fields: Field[] }[] = [
  { title: 'Identificação', fields: [
    { key: 'nome', label: 'Nome de exibição da empresa', max: 100, autoComplete: 'organization' },
    { key: 'unidade', label: 'Identificação da unidade', max: 100 },
    { key: 'cnpj', label: 'CNPJ', max: 18 },
    { key: 'razao_social', label: 'Razão social', max: 180 },
  ] },
  { title: 'Contato institucional', fields: [
    { key: 'contato_nome', label: 'Nome do responsável', max: 100, autoComplete: 'name' },
    { key: 'contato_email', label: 'E-mail de contato', max: 100, type: 'email', autoComplete: 'email' },
    { key: 'contato_telefone', label: 'Telefone', max: 24, optional: true, autoComplete: 'tel' },
  ] },
  { title: 'Endereço', fields: [
    { key: 'cep', label: 'CEP', max: 9, autoComplete: 'postal-code' },
    { key: 'uf', label: 'UF', max: 2, autoComplete: 'address-level1' },
    { key: 'logradouro', label: 'Logradouro', max: 180, autoComplete: 'address-line1' },
    { key: 'numero', label: 'Número ou S/N', max: 20 },
    { key: 'bairro', label: 'Bairro', max: 100 },
    { key: 'cidade', label: 'Cidade', max: 100, autoComplete: 'address-level2' },
    { key: 'complemento', label: 'Complemento', max: 100, optional: true, autoComplete: 'address-line2' },
  ] },
];
const states = 'AC AL AP AM BA CE DF ES GO MA MT MS MG PA PB PR PE PI RJ RN RS RO RR SC SP SE TO'.split(' ');

function CnpjNotice({ cnpj, empresaId }: { cnpj: string; empresaId?: number }) {
  const [matches, setMatches] = useState<{ empresa_id: number; unidade: string }[]>([]);
  const [error, setError] = useState(false);
  const normalized = cnpj.replace(/[./\s-]/g, '').toUpperCase();
  useEffect(() => {
    let active = true;
    setMatches([]); setError(false);
    if (!/^[A-Z0-9]{12}[0-9]{2}$/.test(normalized)) return;
    const timer = window.setTimeout(() => {
      void findCompanyCnpj(normalized).then(result => { if (active) setMatches(result.filter(item => item.empresa_id !== empresaId)); })
        .catch(() => { if (active) setError(true); });
    }, 400);
    return () => { active = false; window.clearTimeout(timer); };
  }, [normalized, empresaId]);
  if (error) return <p className="company-registration-note" role="status">Não foi possível verificar o CNPJ. Confira o preenchimento; os dados serão validados ao salvar.</p>;
  if (!matches.length) return null;
  return <div className="company-registration-notice" role="status"><strong>Este CNPJ já está cadastrado em outra unidade.</strong><p>Use uma identificação diferente para a nova unidade. Os acessos permanecem separados.</p>
    <ul>{matches.map(item => <li key={item.empresa_id}><Link to={`/admin/empresas/${item.empresa_id}/editar`}>{item.unidade || `Empresa #${item.empresa_id}`}</Link></li>)}</ul>
  </div>;
}

export function CompanyRegistrationFields({ nome, onNomeChange, value, onChange, disabled = false, readOnly = false, required = false, empresaId }:
  { nome: string; onNomeChange?: (value: string) => void; value: CompanyRegistrationDraft; onChange?: (value: CompanyRegistrationDraft) => void; disabled?: boolean; readOnly?: boolean; required?: boolean; empresaId?: number }) {
  const id = useId();
  const renderField = (field: Field) => {
    const text = field.key === 'nome' ? nome : value[field.key];
    if (readOnly) return <div key={field.key}><dt>{field.label}</dt><dd>{text || 'Não informado'}</dd></div>;
    const update = (text: string) => { if (field.key === 'nome') onNomeChange?.(text); else onChange?.({ ...value, [field.key]: text }); };
    return <label key={field.key} className="admin-console-setting-field" htmlFor={`${id}-${field.key}`}><span>{field.label}{field.optional && <small> (opcional)</small>}</span>
      {field.key === 'uf' ? <AppSelect id={`${id}-${field.key}`} aria-label="UF" value={text} disabled={disabled} required={required} onChange={event => update(event.target.value)}><option value="">Selecione</option>{states.map(uf => <option key={uf} value={uf}>{uf}</option>)}</AppSelect>
        : <AppInput id={`${id}-${field.key}`} value={text} type={field.type} disabled={disabled} required={!field.optional && (required || field.key === 'nome')} minLength={field.key === 'nome' ? 2 : undefined} maxLength={field.max} autoComplete={field.autoComplete ?? 'off'} inputMode={field.key === 'cep' ? 'numeric' : field.key === 'contato_telefone' ? 'tel' : undefined} onChange={event => update(event.target.value)} />}
    </label>;
  };
  return <div className="company-registration-fields">{groups.map(group => readOnly
    ? <section key={group.title}><h2>{group.title}</h2><dl className="admin-form-grid company-registration-grid company-registration-summary">{group.fields.map(renderField)}</dl></section>
    : <fieldset key={group.title} disabled={disabled}><legend>{group.title}</legend><div className="admin-form-grid company-registration-grid">{group.fields.map(renderField)}</div>{group.title === 'Identificação' && <CnpjNotice cnpj={value.cnpj} empresaId={empresaId} />}{group.title === 'Contato institucional' && <p className="company-registration-note">O contato responsável não recebe acesso de administrador por preencher estes dados.</p>}</fieldset>
  )}</div>;
}
