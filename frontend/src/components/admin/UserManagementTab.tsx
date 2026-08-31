import { useEffect, useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { AlertCircle, CheckCircle2, Copy, Link2, Plus, QrCode, Trash2, UsersRound } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { cn } from '@/lib/utils';
import { criarConvite, listarConvites, listarUsuarios, revogarConvite, type Convite, type UsuarioEmpresa } from '@/services/convites';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(value));
}

export function UserManagementTab() {
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [convites, setConvites] = useState<Convite[]>([]);
  const [email, setEmail] = useState('');
  const [validade, setValidade] = useState(7);
  const [maxUses, setMaxUses] = useState(1);
  const [creating, setCreating] = useState(false);
  const [revoking, setRevoking] = useState<number | null>(null);
  const [linkGerado, setLinkGerado] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const carregar = async () => {
    try {
      const [nextUsuarios, nextConvites] = await Promise.all([listarUsuarios(), listarConvites()]);
      setUsuarios(nextUsuarios);
      setConvites(nextConvites);
    } catch {
      setFeedback('Não foi possível carregar os usuários e convites.');
    }
  };

  useEffect(() => { void carregar(); }, []);

  const criar = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setCreating(true);
    try {
      const result = await criarConvite({ email: email.trim() || undefined, validade_dias: validade, max_uses: maxUses });
      const link = `${window.location.origin}/cadastro/${result.token}`;
      setLinkGerado(link);
      setConvites((current) => [result.convite, ...current]);
      setEmail('');
      setFeedback('Convite criado com sucesso. Compartilhe o link ou QR code.');
    } catch (error: any) {
      setFeedback(error.response?.data?.message ?? 'Não foi possível criar o convite.');
    } finally { setCreating(false); }
  };

  const revogar = async (id: number) => {
    setRevoking(id);
    try {
      const updated = await revogarConvite(id);
      setConvites((current) => current.map((convite) => convite.id === id ? updated : convite));
      setFeedback('Convite revogado. O link não pode mais ser utilizado.');
    } catch { setFeedback('Não foi possível revogar o convite.'); }
    finally { setRevoking(null); }
  };

  const copiar = async (link: string) => {
    await navigator.clipboard.writeText(link);
    setFeedback('Link copiado para a área de transferência.');
  };

  const ativos = useMemo(() => convites.filter((convite) => convite.status === 'ativo').length, [convites]);

  return <div className="admin-users-content">
    <div className="admin-users-heading">
      <div><span className="admin-page-eyebrow">Acessos da empresa</span><h1>Usuários e convites</h1><p>Crie acessos seguros e acompanhe quem já entrou na plataforma.</p></div>
      <div className="admin-users-stat"><UsersRound size={18} /><span><strong>{usuarios.length}</strong> usuários</span><i /><span><strong>{ativos}</strong> convites ativos</span></div>
    </div>

    {feedback && <div className={cn('admin-feedback', feedback.startsWith('Não foi') && 'is-error')} role="status"><span>{feedback.startsWith('Não foi') ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}</span>{feedback}</div>}

    <div className="admin-users-grid">
      <section className="admin-users-card admin-invite-form-card">
        <div className="admin-users-card-heading"><span className="admin-users-heading-icon"><Plus size={19} /></span><div><h2>Novo convite</h2><p>O aluno cria a própria senha pelo link seguro.</p></div></div>
        <form onSubmit={criar} className="admin-invite-form">
          <label>E-mail do aluno <small>opcional</small><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="aluno@empresa.com" /></label>
          <div className="admin-invite-options">
            <label>Validade<select value={validade} onChange={(event) => setValidade(Number(event.target.value))}><option value={1}>1 dia</option><option value={7}>7 dias</option><option value={14}>14 dias</option><option value={30}>30 dias</option></select></label>
            <label>Usos permitidos<select value={maxUses} onChange={(event) => setMaxUses(Number(event.target.value))}><option value={1}>1 uso</option><option value={5}>5 usos</option><option value={20}>20 usos</option><option value={100}>100 usos</option></select></label>
          </div>
          <AppButton type="submit" disabled={creating} icon={<Link2 size={16} />}>{creating ? 'Gerando...' : 'Gerar convite'}</AppButton>
        </form>
      </section>

      <section className="admin-users-card admin-users-list-card">
        <div className="admin-users-card-heading"><span className="admin-users-heading-icon is-secondary"><UsersRound size={19} /></span><div><h2>Alunos cadastrados</h2><p>Usuários que concluíram o cadastro.</p></div></div>
        <div className="admin-users-list">{usuarios.length === 0 ? <p className="admin-users-empty">Ainda não há alunos cadastrados.</p> : usuarios.map((usuario) => <div key={usuario.id} className="admin-user-row"><span>{usuario.name.charAt(0).toUpperCase()}</span><div><strong>{usuario.name}</strong><small>{usuario.email}</small></div><em>Nível {usuario.level}</em></div>)}</div>
      </section>
    </div>

    <section className="admin-users-card admin-invites-card">
      <div className="admin-users-card-heading"><span className="admin-users-heading-icon is-accent"><QrCode size={19} /></span><div><h2>Convites emitidos</h2><p>Links com expiração e uso controlado.</p></div></div>
      <div className="admin-invites-table">{convites.length === 0 ? <p className="admin-users-empty">Nenhum convite criado ainda.</p> : convites.map((convite) => <div key={convite.id} className="admin-invite-row"><div><strong>{convite.email ?? 'Link aberto para a empresa'}</strong><small>Expira em {formatDate(convite.expires_at)} · {convite.uses}/{convite.max_uses} usos</small></div><span className={`admin-invite-status is-${convite.status}`}>{convite.status}</span>{convite.status === 'ativo' && <AppButton variant="ghost" size="sm" icon={<Trash2 size={14} />} disabled={revoking === convite.id} onClick={() => revogar(convite.id)}>Revogar</AppButton>}</div>)}</div>
    </section>

    {linkGerado && <div className="admin-qr-modal" role="dialog" aria-modal="true" aria-label="Convite gerado"><div className="admin-qr-card"><button className="admin-qr-close" onClick={() => setLinkGerado(null)} aria-label="Fechar">×</button><div className="admin-qr-title"><QrCode size={20} /><div><strong>Convite pronto</strong><span>Compartilhe pelo link ou QR code.</span></div></div><div className="admin-qr-code"><QRCodeSVG value={linkGerado} size={172} level="M" includeMargin /></div><div className="admin-qr-link"><span>{linkGerado}</span><button onClick={() => copiar(linkGerado)}><Copy size={15} /> Copiar</button></div></div></div>}
  </div>;
}
