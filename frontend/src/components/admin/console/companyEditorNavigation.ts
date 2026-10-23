export type CompanyEditorTab = 'data' | 'appearance' | 'features';

export const companyEditorTabs: { id: CompanyEditorTab; label: string; value: string }[] = [
  { id: 'data', label: 'Dados cadastrais', value: 'dados' },
  { id: 'appearance', label: 'Aparência', value: 'aparencia' },
  { id: 'features', label: 'Funcionalidades', value: 'funcionalidades' },
];

export function resolveCompanyEditorTab(search: string, fallback: CompanyEditorTab = 'data'): CompanyEditorTab {
  const value = new URLSearchParams(search).get('aba');
  return companyEditorTabs.find(tab => tab.value === value)?.id ?? fallback;
}

export function companyEditorPath(empresaId: number, tab: CompanyEditorTab): string {
  const value = companyEditorTabs.find(item => item.id === tab)?.value ?? 'dados';
  return `/admin/empresas/${empresaId}/editar${tab === 'data' ? '' : `?aba=${value}`}`;
}
