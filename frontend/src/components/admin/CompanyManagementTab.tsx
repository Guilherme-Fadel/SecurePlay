import { useState } from 'react';
import { AlertCircle, Building2, CheckCircle2, Copy, Plus } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { criarEmpresa, type EmpresaAdministravel } from '@/services/admin';

interface CompanyManagementTabProps {
  empresas: EmpresaAdministravel[];
  onEmpresaCriada: (empresa: EmpresaAdministravel) => void;
}

export function CompanyManagementTab({
  empresas,
  onEmpresaCriada,
}: CompanyManagementTabProps) {
  const [nome, setNome] = useState('');
  const [emailAdministrador, setEmailAdministrador] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [linkAdministrador, setLinkAdministrador] = useState<string | null>(null);

  const cadastrar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSalvando(true);
    setMensagem(null);
    try {
      const resultado = await criarEmpresa({
        nome: nome.trim(),
        email_administrador: emailAdministrador.trim(),
      });
      onEmpresaCriada(resultado.empresa);
      setNome('');
      setEmailAdministrador('');
      setErro(false);
      setLinkAdministrador(`${window.location.origin}/cadastro#${resultado.token}`);
      setMensagem('Empresa cadastrada e convite do administrador gerado.');
    } catch (error: any) {
      setErro(true);
      setMensagem(error?.response?.data?.message || 'Não foi possível cadastrar a empresa.');
    } finally {
      setSalvando(false);
    }
  };

  const copiarLink = async () => {
    if (!linkAdministrador) return;
    await navigator.clipboard.writeText(linkAdministrador);
    setErro(false);
    setMensagem('Link do administrador copiado.');
  };

  return <div className="admin-companies-content app-page">
    <div className="admin-page-heading">
      <div>
        <span className="admin-page-eyebrow">Administração da plataforma</span>
        <h1>Empresas</h1>
        <p>Cadastre a empresa e já gere o acesso do administrador que cuidará dela.</p>
      </div>
    </div>

    {mensagem && <div className={`admin-feedback ${erro ? 'is-error' : ''}`} role="status" aria-live="polite">
      {erro ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
      <span>{mensagem}</span>
    </div>}

    <section className="admin-company-form-card">
      <div className="admin-company-form-heading"><Building2 size={20} /><div><strong>Nova empresa</strong><span>Informe quem será o administrador responsável pela organização.</span></div></div>
      <form onSubmit={cadastrar} className="admin-company-form">
        <div className="admin-company-form-fields">
          <label htmlFor="empresa-nome">Nome da empresa<input id="empresa-nome" value={nome} onChange={(event) => setNome(event.target.value)} minLength={2} maxLength={100} required placeholder="Ex.: Empresa Exemplo Ltda." /></label>
          <label htmlFor="empresa-admin-email">E-mail do administrador<input id="empresa-admin-email" type="email" value={emailAdministrador} onChange={(event) => setEmailAdministrador(event.target.value)} required placeholder="admin@empresa.com" /></label>
        </div>
        <AppButton type="submit" icon={<Plus size={16} />} disabled={salvando}>{salvando ? 'Cadastrando...' : 'Cadastrar empresa e gerar convite'}</AppButton>
      </form>
    </section>

    {linkAdministrador && <section className="admin-company-invite-card">
      <strong>Convite do administrador inicial</strong>
      <p>Envie este link somente para o e-mail informado. Ao concluir o cadastro, a pessoa receberá a role <code>admin</code> desta empresa.</p>
      <div><input value={linkAdministrador} readOnly aria-label="Link do convite do administrador" /><AppButton variant="soft" size="sm" icon={<Copy size={15} />} onClick={copiarLink}>Copiar link</AppButton></div>
    </section>}

    <section className="admin-company-list-card">
      <div className="admin-company-list-heading"><strong>Empresas cadastradas</strong><span>{empresas.length}</span></div>
      {empresas.length ? <ul className="admin-company-list">{empresas.map((empresa) => <li key={empresa.id}><span className="admin-company-icon"><Building2 size={17} /></span><span><strong>{empresa.nome}</strong><small>Configuração e usuários disponíveis no menu Administrador.</small></span></li>)}</ul> : <p className="admin-users-empty">Nenhuma empresa cadastrada.</p>}
    </section>
  </div>;
}
