import { useEffect, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Copy, Plus } from "lucide-react";
import { AppButton } from "@/components/ui/buttons/AppButton";
import { AppSearchInput } from "@/components/ui/forms/AppSearchInput";
import { AppSelect } from "@/components/ui/forms/AppSelect";
import { AppInput } from "@/components/ui/forms/AppInput";
import { criarEmpresa, listarEmpresasPaginadas, type EmpresaAdministravel, type EmpresasPaginadas } from "@/services/admin";
import { AdminListCard, AdminListContent, AdminListState, AdminPagination, AdminPageHeader, AdminListToolbar } from "@/components/admin/AdminListLayout";

interface CompanyManagementTabProps {
  onEmpresaCriada: (empresa: EmpresaAdministravel) => void;
  storageKey: string;
  empresaNome?: string;
  onNomeChange?: (nome: string) => void;
}

export function CompanyManagementTab({
  onEmpresaCriada,
  storageKey,
  empresaNome,
  onNomeChange,
}: CompanyManagementTabProps) {
  const [nome, setNome] = useState("");
  const [emailAdministrador, setEmailAdministrador] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState(false);
  const [linkAdministrador, setLinkAdministrador] = useState<string | null>(
    null,
  );
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [list, setList] = useState<EmpresasPaginadas | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [listError, setListError] = useState(false);
  const [restoredKey, setRestoredKey] = useState<string | null>(null);

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
    setList(null);
    setRestoredKey(storageKey);
  }, [storageKey]);
  useEffect(() => {
    if (restoredKey !== storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify({ search, sort, page })); }
    catch { /* Listagem permanece utilizável sem sessionStorage. */ }
  }, [search, sort, page, storageKey, restoredKey]);
  useEffect(() => {
    if (restoredKey !== storageKey) return;
    let cancelled = false;
    setLoadingList(true);
    setListError(false);
    void listarEmpresasPaginadas({ page, pageSize: 25, search, sort })
      .then((data) => {
        if (cancelled) return;
        if (page > Math.max(1, data.totalPages)) {
          setPage(Math.max(1, data.totalPages));
          return;
        }
        setList(data);
      })
      .catch(() => { if (!cancelled) { setList(null); setListError(true); } })
      .finally(() => { if (!cancelled) setLoadingList(false); });
    return () => { cancelled = true; };
  }, [page, search, sort, reload, restoredKey, storageKey]);

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
      setPage(1);
      setReload((current) => current + 1);
      setNome("");
      setEmailAdministrador("");
      setErro(false);
      setLinkAdministrador(
        `${window.location.origin}/cadastro#${resultado.token}`,
      );
      setMensagem("Empresa cadastrada e convite do administrador gerado.");
    } catch (error: any) {
      setErro(true);
      setMensagem(
        error?.response?.data?.message ||
          "Não foi possível cadastrar a empresa.",
      );
    } finally {
      setSalvando(false);
    }
  };

  const copiarLink = async () => {
    if (!linkAdministrador) return;
    await navigator.clipboard.writeText(linkAdministrador);
    setErro(false);
    setMensagem("Link do administrador copiado.");
  };

  return (
    <div className="admin-companies-content app-page">
      <AdminPageHeader eyebrow="Administração da plataforma" title="Empresas" description="Cadastre a empresa e já gere o acesso do administrador que cuidará dela." />

      {onNomeChange && (
        <section className="admin-company-form-card">
          <div className="admin-company-form-heading">
            <Building2 size={20} />
            <div>
              <strong>Empresa selecionada</strong>
              <span>
                As alterações serão gravadas pelo botão único de salvar.
              </span>
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

      <section className="admin-company-form-card">
        <div className="admin-company-form-heading">
          <Building2 size={20} />
          <div>
            <strong>Nova empresa</strong>
            <span>
              Informe quem será o administrador responsável pela organização.
            </span>
          </div>
        </div>
        <form onSubmit={cadastrar} className="admin-company-form">
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
          <AppButton
            type="submit"
            icon={<Plus size={16} />}
            disabled={salvando}
          >
            {salvando ? "Cadastrando..." : "Cadastrar empresa e gerar convite"}
          </AppButton>
        </form>
      </section>

      {linkAdministrador && (
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
        </section>
      )}

      <AdminListCard className="admin-company-list-card" loading={loadingList}>
        <div className="admin-company-list-heading">
          <strong>Empresas cadastradas</strong>
          <span aria-label="Total de empresas encontradas">{loadingList || listError ? "—" : list?.total ?? "—"}</span>
        </div>
        <AdminListToolbar onSubmit={(event) => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()); }}>
          <div className="admin-company-filter-field"><span>Buscar por nome</span>
            <AppSearchInput label="Buscar empresas por nome" value={searchInput} onChange={(event) => setSearchInput(event.target.value)} placeholder="Nome da empresa" maxLength={100} />
          </div>
          <AppButton type="submit" size="control" variant="ghost">Buscar</AppButton>
          <label>Ordenar por nome
            <AppSelect value={sort} onChange={(event) => { setPage(1); setSort(event.target.value as "asc" | "desc"); }}>
              <option value="asc">A–Z</option><option value="desc">Z–A</option>
            </AppSelect>
          </label>
        </AdminListToolbar>
        <AdminListContent>
        {listError ? <AdminListState kind="error" onRetry={() => setReload((current) => current + 1)}>Não foi possível carregar as empresas.</AdminListState> : loadingList ? <AdminListState kind="loading">Carregando empresas...</AdminListState> : list?.items.length ? (
          <ul className="admin-company-list">
            {list.items.map((empresa) => (
              <li key={empresa.id}>
                <span className="admin-company-icon">
                  <Building2 size={17} />
                </span>
                <span>
                  <strong>{empresa.nome}</strong>
                  <small>
                    Configuração e usuários disponíveis no menu Administrador.
                  </small>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <AdminListState kind="empty">{search ? "Nenhuma empresa encontrada para esta busca." : "Nenhuma empresa cadastrada."}</AdminListState>
        )}
        </AdminListContent>
        {!loadingList && !listError && list && <AdminPagination page={page} totalPages={list.totalPages} ariaLabel="Páginas de empresas" onPageChange={setPage} />}
      </AdminListCard>
    </div>
  );
}
