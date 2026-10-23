import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Building2, ChevronDown } from 'lucide-react';
import { AppSearchInput } from '@/components/ui/forms/AppSearchInput';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { getTema, listarEmpresasPaginadas, type EmpresaAdministravel } from '@/services/admin';

export function PlatformCompanyFilter({ empresaId, onChange, allowAll = true, compact = false, fieldLabel, disabled = false }: { empresaId?: number; onChange: (id?: number) => void; allowAll?: boolean; compact?: boolean; fieldLabel?: string; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loaded, setLoaded] = useState<{ search: string; items: EmpresaAdministravel[] }>({ search: '', items: [] });
  const root = useRef<HTMLDetailsElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ top: 0, left: 0, width: 340, maxHeight: 320 });
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      const rect = root.current?.getBoundingClientRect();
      if (!rect) return;
      const width = Math.min(Math.max(rect.width, 300), window.innerWidth - 24);
      const below = window.innerHeight - rect.bottom - 14;
      const above = rect.top - 14;
      const upwards = below < 180 && above > below;
      const maxHeight = Math.min(360, upwards ? above : below);
      setPosition({ top: upwards ? Math.max(12, rect.top - maxHeight - 6) : rect.bottom + 6, left: Math.max(12, Math.min(rect.left, window.innerWidth - width - 12)), width, maxHeight });
    };
    update(); window.addEventListener('resize', update); window.addEventListener('scroll', update, true);
    return () => { window.removeEventListener('resize', update); window.removeEventListener('scroll', update, true); };
  }, [open]);
  useEffect(() => { const timer = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 250); return () => clearTimeout(timer); }, [search]);
  const filters = { page, pageSize: 25, search: debouncedSearch, sort: 'asc' as const };
  const query = useCachedQuery(adminQueryKey('companies-page', undefined, filters), () => listarEmpresasPaginadas(filters), { enabled: open });
  useEffect(() => {
    if (!query.data) return;
    const items = query.data.items;
    setLoaded((previous) => {
      const combined = page === 1 || previous.search !== debouncedSearch ? items : [...previous.items, ...items];
      return { search: debouncedSearch, items: [...new Map(combined.map((company) => [company.id, company])).values()] };
    });
  }, [query.data, page, debouncedSearch]);
  const companies = loaded.search === debouncedSearch ? loaded.items : [];
  const selected = useCachedQuery(adminQueryKey('theme', empresaId), () => getTema(empresaId), { enabled: Boolean(empresaId) });
  const choose = (id?: number) => { onChange(id); if (root.current) root.current.open = false; };
  useEffect(() => {
    if (!open) return;
    const dismiss = (event: PointerEvent) => { if (root.current && !root.current.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) root.current.open = false; };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);
  return <details ref={root} className={`admin-platform-company-filter${compact ? ' is-compact' : ''}`} onToggle={(event) => setOpen(event.currentTarget.open)} onKeyDown={(event) => { if (event.key === 'Escape' && root.current) { root.current.open = false; root.current.querySelector('summary')?.focus(); } }}>
    <summary role={fieldLabel ? 'combobox' : undefined} aria-label={fieldLabel ?? 'Filtrar por empresa'} aria-expanded={open} aria-haspopup={fieldLabel ? 'dialog' : undefined} aria-disabled={disabled} tabIndex={disabled ? -1 : 0} onClick={event => { if (disabled) event.preventDefault(); }}><Building2 size={16} /><span>{!compact && <small>Empresa</small>}<strong>{empresaId ? selected.data?.nome ?? `Empresa #${empresaId}` : allowAll ? 'Todas as empresas' : 'Selecionar empresa'}</strong></span><ChevronDown size={15} /></summary>
    {open && !disabled && createPortal(<div ref={panel} role={fieldLabel ? 'dialog' : undefined} aria-label={fieldLabel ? 'Selecionar empresa' : undefined} className="admin-platform-company-options" style={{ position: 'fixed', ...position }}>
      <AppSearchInput label="Buscar empresa" autoFocus placeholder="Buscar empresa pelo nome" value={search} onChange={(event) => setSearch(event.target.value)} />
      {allowAll && <button type="button" className={!empresaId ? 'is-active' : ''} onClick={() => choose()}>Todas as empresas</button>}
      <div className="admin-platform-company-results" aria-busy={query.loading} onScroll={(event) => {
        const list = event.currentTarget;
        if (!query.loading && query.data && page < query.data.totalPages && list.scrollHeight - list.scrollTop - list.clientHeight < 48) {
          const currentPage = query.data.page;
          setPage((previous) => previous === currentPage ? previous + 1 : previous);
        }
      }}>
        {companies.map((company) => <button type="button" key={company.id} className={company.id === empresaId ? 'is-active' : ''} onClick={() => choose(company.id)}>{company.nome}</button>)}
        {query.loading && <p role="status">Carregando empresas…</p>}
        {query.error && <div role="alert"><p>Não foi possível carregar as empresas.</p><AppButton size="sm" onClick={query.refetch}>Tentar novamente</AppButton></div>}
        {!query.loading && !query.error && !companies.length && <p>Nenhuma empresa encontrada.</p>}
      </div>
    </div>, document.querySelector('.admin-console') ?? document.body)}
  </details>;
}
