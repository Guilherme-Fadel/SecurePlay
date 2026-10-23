import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNotebookLayout } from '@/hooks/useNotebookLayout';
import { AlertCircle, CheckCircle2, Copy, Plus } from "lucide-react";
import { AppButton } from "@/components/ui/buttons/AppButton";
import { AppSearchInput } from "@/components/ui/forms/AppSearchInput";
import { AppSelect } from "@/components/ui/forms/AppSelect";
import { AppInput } from "@/components/ui/forms/AppInput";
import { criarEmpresa, listarEmpresasPaginadas, type EmpresaAdministravel } from "@/services/admin";
import { AdminListCard, AdminListContent, AdminListState, AdminPagination, AdminPageHeader, AdminListToolbar } from "@/components/admin/AdminListLayout";
import { AdminHelpTip } from "@/components/admin/AdminHelpTip";
import { useAdminUnsavedChanges } from "@/hooks/useAdminUnsavedChanges";

interface CompanyManagementTabProps {
  onEmpresaCriada: (empresa: EmpresaAdministravel) => void;
  storageKey: string;
  empresaNome?: string;
  onNomeChange?: (nome: string) => void;
  mode?: 'combined' | 'list' | 'new';
  onAdministrar?: (empresa: EmpresaAdministravel) => void;
  consoleMode?: boolean;
  headerActions?: ReactNode;
}

export function CompanyManagementTab({
  onEmpresaCriada,
  storageKey,
  empresaNome,
  onNomeChange,
  mode = 'combined',
  onAdministrar,
  consoleMode = false,
  headerActions,
}: CompanyManagementTabProps) {
  const [nome, setNome] = useState("");
  const notebook = useNotebookLayout();
  const pageSize = consoleMode ? 25 : notebook ? 3 : 25;
  const [emailAdministrador, setEmailAdministrador] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [linkAdministrador, setLinkAdministrador] = useState<string | null>(
    null,
  );
  const [empresaCriada, setEmpresaCriada] = useState<EmpresaAdministravel | null>(null);
  const [conviteCopiado, setConviteCopiado] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);




  const [restoredKey, setRestoredKey] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    let nextSearch = "";
    let nextSort: "asc" | "desc" = "asc";
    let nextPage = 1;
    try {
      const saved = sessionStorage.getItem(storageKey);
      if (saved) {
        const state = JSON.parse(saved) as { search?: string; sort?: string; page?: number };
        if (typeof state.search === "string") nextSearch = state.search;
        if (state.sort === "desc") nextSort = "desc";
        if (Number.isInteger(state.page) && (state.page as number) > 0) nextPage = state.page as number;
      }
    } catch { /* Filtros persistidos são opcionais. */ }
    setSearchInput(nextSearch);
    setSearch(nextSearch);
    setSort(nextSort);
    setPage(nextPage);

    setRestoredKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (restoredKey !== storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ search, sort, page })); }
    catch { /* Listagem permanece utilizável sem sessionStorage. */ }
  }, [search, sort, page, storageKey, restoredKey]);
  const filters = { page, pageSize, search, sort };
  const query = useCachedQuery(adminQueryKey('companies-page', undefined, filters), () => listarEmpresasPaginadas(filters), { enabled: mode !== 'new' && restoredKey === storageKey });
  const list = query.data;
  const loadingList = query.loading;
  const listError = Boolean(query.error);
  useEffect(() => { if (list && page > Math.max(1, list.totalPages)) setPage(Math.max(1, list.totalPages)); }, [list, page]);

  const cadastrar = async (): Promise<boolean> => {
    if (salvando || !formRef.current?.reportValidity()) return false;
    setSalvando(true);
    setMensagem(null);
    try {
      const resultado = await criarEmpresa({
        nome: nome.trim(),
        email_administrador: emailAdministrador.trim(),
      });
      setEmpresaCriada(resultado.empresa);
      setConviteCopiado(false);
      onEmpresaCriada(resultado.empresa);
      setPage(1);

      setNome("");
      setEmailAdministrador("");
      setErro(false);
      setLinkAdministrador(
        `${window.location.origin}/cadastro#${resultado.token}`,
      );
      setMensagem("Empresa cadastrada e convite do administrador gerado.");
      return true;
    } catch (error: any) {
      setErro(true);
      setMensagem(
        error?.response?.data?.message ||
          "Não foi possível cadastrar a empresa.",
      );
      return false;
    } finally {
      setSalvando(false);
    }
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    await cadastrar();
  };
  const { prompt: unsavedPrompt } = useAdminUnsavedChanges(consoleMode && mode === 'new' && Boolean(nome.trim() || emailAdministrador.trim() || (linkAdministrador && !conviteCopiado)), undefined, salvando);

  const copiarLink = async () => {
    if (!linkAdministrador) return;
    await navigator.clipboard.writeText(linkAdministrador);
    setConviteCopiado(true);
    setErro(false);
    setMensagem("Link do administrador copiado.");
  };

  return (
    <>{unsavedPrompt}<div className="admin-companies-content app-page">
      <AdminPageHeader title={mode === 'new' ? 'Nova empresa' : 'Empresas'} description={mode === 'new' ? 'Cadastre a empresa e gere o acesso do administrador responsável.' : 'Escolha uma empresa para administrar ou cadastre uma nova.'} action={headerActions || (consoleMode && mode === 'new') ? <>{headerActions}{consoleMode && mode === 'new' && <AppButton type="submit" form="admin-console-company-form" disabled={salvando} aria-label="Cadastrar empresa e gerar convite">{salvando ? 'Cadastrando…' : 'Cadastrar'}</AppButton>}</> : undefined} />

      {onNomeChange && (
        <section className="admin-company-form-card">
          <div className="admin-company-form-heading">
            <div className="admin-heading-title">
              <h2>Empresa selecionada</h2>
              <AdminHelpTip label="Empresa selecionada" text="As alterações serão gravadas pelo botão único de salvar." />
            </div>
          </div>
          <label className="settings-select-field">
            <span>Nome da empresa</span>
            <AppInput
              value={empresaNome ?? ""}
              onChange={(event) => onNomeChange(event.target.value)}
              minLength={2}
              maxLength={100}
            />
          </label>
        </section>
      )}

      {mensagem && (
        <div
          className={`admin-feedback ${erro ? "is-error" : ""}`}
          role="status"
          aria-live="polite"
        >
          {erro ? <AlertCircle size={17} /> : <CheckCircle2 size={17} />}
          <span>{mensagem}</span>
        </div>
      )}

      {mode !== 'list' && <section className="admin-company-form-card">
        {!consoleMode && <div className="admin-company-form-heading">
          <div className="admin-heading-title">
            <h2>Nova empresa</h2>
            <AdminHelpTip label="Nova empresa" text="Informe quem será o administrador responsável pela organização." />
          </div>
        </div>}
        <form id={consoleMode ? "admin-console-company-form" : undefined} ref={formRef} onSubmit={handleSubmit} className="admin-company-form">
          <div className="admin-company-form-fields">
            <label htmlFor="empresa-nome">
              Nome da empresa
              <AppInput
                id="empresa-nome"
                value={nome}
                onChange={(event) => setNome(event.target.value)}
                minLength={2}
                maxLength={100}
                required
                placeholder="Ex.: Empresa Exemplo Ltda."
              />
            </label>
            <label htmlFor="empresa-admin-email">
              E-mail do administrador
              <AppInput
                id="empresa-admin-email"
                type="email"
                value={emailAdministrador}
                onChange={(event) => setEmailAdministrador(event.target.value)}
                required
                placeholder="admin@empresa.com"
              />
            </label>
          </div>
          {!consoleMode && <AppButton
            type="submit"
            icon={<Plus size={16} />}
            disabled={salvando}
          >
            {salvando ? "Cadastrando..." : "Cadastrar empresa e gerar convite"}
          </AppButton>}
        </form>
      </section>}

      {mode !== 'list' && linkAdministrador && (
        <section className="admin-company-invite-card">
          <strong>Convite do administrador inicial</strong>
          <p>
            Envie este link somente para o e-mail informado. Ao concluir o
            cadastro, a pessoa receberá a role <code>admin</code> desta empresa.
          </p>
          <div>
            <AppInput
              value={linkAdministrador}
              readOnly
              aria-label="Link do convite do administrador"
            />
            <AppButton
              variant="soft"
              size="sm"
              icon={<Copy size={15} />}
              onClick={copiarLink}
            >
              Copiar link
            </AppButton>
          </div>
          {empresaCriada && onAdministrar && <AppButton type="button" variant="secondary" onClick={() => onAdministrar(empresaCriada)}>Abrir empresa</AppButton>}
        </section>
      )}

      {(mode === 'list' || mode === 'combined') && <AdminListCard className="admin-company-list-card" loading={loadingList}>
        <div className="admin-company-list-heading">
          <strong>Empresas cadastradas</strong>
          <span aria-label="Total de empresas encontradas">{loadingList || listError ? "—" : list?.total ?? "—"}</span>
        </div>
        <AdminListToolbar onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
          <div className="admin-company-filter-field">
            <AppSearchInput label="Buscar empresas por nome" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome da empresa" maxLength={100} />
          </div>
          <AppButton type="submit" size="control" variant="ghost">Buscar</AppButton>
          <label className="admin-company-sort"><span className="sr-only">Ordenar por nome</span>
            <AppSelect aria-label="Ordenar por nome" value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as "asc" | "desc"); }}>
              <option value="asc">A–Z</option><option value="desc">Z–A</option>
            </AppSelect>
          </label>
        </AdminListToolbar>
        <AdminListContent>
        {listError ? <AdminListState kind="error" onRetry={query.refetch}>Não foi possível carregar as empresas.</AdminListState> : loadingList ? <AdminListState kind="loading">Carregando empresas...</AdminListState> : list?.items.length ? (
          <ul className="admin-company-list">
            {list.items.map((empresa) => (
              <li key={empresa.id}>
                <span>
                  <strong>{empresa.nome}</strong>
                    <small>Empresa #{empresa.id}</small>
                </span>
                {onAdministrar && <AppButton type="button" size="sm" variant="soft" onClick={() => onAdministrar(empresa)}>Administrar</AppButton>}
              </li>
            ))}
          </ul>
        ) : (
          <AdminListState kind="empty">{search ? "Nenhuma empresa encontrada para esta busca." : "Nenhuma empresa cadastrada."}</AdminListState>
        )}
        </AdminListContent>
        {!loadingList && !listError && list && <AdminPagination alwaysVisible={consoleMode} page={page} totalPages={list.totalPages} ariaLabel="Páginas de empresas" onPageChange={setPage} />}
      </AdminListCard>}
    </div></>
  );
}
