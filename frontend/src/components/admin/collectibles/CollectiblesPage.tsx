import { Link, useLocation, useNavigate } from 'react-router-dom';
import { AdminPageHeader } from '@/components/admin/AdminListLayout';
import { collectiblesKindFromPath, collectiblesPath } from '@/components/admin/console/consoleNavigation';
import { formNavigationState, kindCopy, openFormOf, savedFormState, type CollectibleKind } from './adminCollectiblesModel';
import { CollectibleFormPage } from './CollectibleFormPage';
import { CollectiblesList } from './CollectiblesList';

const KINDS: readonly CollectibleKind[] = ['items', 'kits'];

/**
 * Colecionáveis do console (só `platform_admin`; o backend autoriza): alternância Itens avulsos | Kits por rota
 * e, sobre ela, o formulário de cadastro/edição. Voltar do formulário remonta a listagem, que busca de novo.
 */
export function CollectiblesPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const kind = collectiblesKindFromPath(location.pathname.replace(/\/+$/, ''));
  const form = openFormOf(location.state);
  const openForm = (next: Parameters<typeof formNavigationState>[0]) => navigate(location.pathname, { state: formNavigationState(next) });
  // Chave estável: salvar troca o registro do histórico, mas o formulário não deve remontar (perderia mensagem e ajuste aberto).
  if (form) return <CollectibleFormPage key={`form-${form.kind}`} kind={form.kind} record={form.record} onBack={() => navigate(-1)}
    onSaved={(row) => navigate(location.pathname, { replace: true, state: savedFormState(row) })} />;
  return <div className="admin-users-content">
    <AdminPageHeader title="Colecionáveis" description="Itens avulsos e kits do personagem que os alunos compram com chaves. Só o que está publicado aparece na loja." />
    <nav className="admin-company-editor-tabs" aria-label="Tipos de colecionável">
      {KINDS.map((item) => <Link key={item} to={collectiblesPath(item)} aria-current={item === kind ? 'page' : undefined}>{kindCopy[item].tab}</Link>)}
    </nav>
    <CollectiblesList key={kind} kind={kind} onCreate={(next) => openForm({ kind: next })} onEdit={(next, record) => openForm({ kind: next, record })} />
  </div>;
}
