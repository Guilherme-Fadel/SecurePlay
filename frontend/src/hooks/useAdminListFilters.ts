import { useEffect, useState } from 'react';

type Filters = { page: number; pageSize: number; search: string; sort: string; status: string };

export function normalizeAdminListFilters(saved: Partial<Filters> | null, defaultSort = ''): Filters {
  const { page = 1, pageSize = 25, search, sort = '', status = '' } = saved ?? {};
  return {
    page: Number.isSafeInteger(page) && page > 0 ? page : 1,
    pageSize: [25, 50, 100].includes(pageSize) ? pageSize : 25,
    search: typeof search === 'string' ? search : '',
    sort: ['asc', 'desc'].includes(sort) ? sort : defaultSort,
    status: ['active', 'inactive', 'management'].includes(status) ? status : '',
  };
}

function restore(key: string, defaultSort: string) {
  try { return normalizeAdminListFilters(JSON.parse(sessionStorage.getItem(key) ?? '{}'), defaultSort); }
  catch { return normalizeAdminListFilters(null, defaultSort); }
}

export function useAdminListFilters(storageKey: string, defaultSort = '') {
  const [stored, setStored] = useState(() => ({ key: storageKey, filters: restore(storageKey, defaultSort) }));
  const [draft, setDraft] = useState(() => ({ key: storageKey, value: stored.filters.search }));
  const filters = stored.key === storageKey ? stored.filters : restore(storageKey, defaultSort);
  const search = draft.key === storageKey ? draft.value : filters.search;
  const setFilters = (update: (previous: Filters) => Filters) => setStored(previous => ({ key: storageKey, filters: update(previous.key === storageKey ? previous.filters : restore(storageKey, defaultSort)) }));
  const setSearch = (value: string) => setDraft({ key: storageKey, value });
  useEffect(() => {
    const timer = setTimeout(() => setStored(previous => {
      const current = previous.key === storageKey ? previous.filters : restore(storageKey, defaultSort);
      return { key: storageKey, filters: current.search === search ? current : { ...current, search, page: 1 } };
    }), 300);
    return () => clearTimeout(timer);
  }, [search, storageKey, defaultSort]);
  useEffect(() => {
    if (stored.key !== storageKey) return;
    try { sessionStorage.setItem(storageKey, JSON.stringify(stored.filters)); } catch { /* Optional preference. */ }
  }, [stored, storageKey]);
  const normalizePage = (totalPages: number) => {
    if (filters.page > Math.max(1, totalPages)) setFilters(previous => ({ ...previous, page: Math.max(1, totalPages) }));
  };
  return { filters, setFilters, search, setSearch, normalizePage };
}
