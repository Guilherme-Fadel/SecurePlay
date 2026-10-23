import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AdminDataGrid, type AdminDataGridColumn } from '@/components/admin/console/AdminDataGrid';
import { adminConsolePath } from '@/components/admin/console/consoleNavigation';
import { ThemeProvider } from '@/contexts/ThemeContext';
import '@/styles/app-ui.css';
import './admin-console.css';

type FixtureRow = { id: number; name: string; detail: string; status: string };

export default function AdminGridPreview() {
  return <ThemeProvider><ConsoleGridFixture /></ThemeProvider>;
}

function ConsoleGridFixture() {
  const [source, setSource] = useState<'usuarios' | 'auditoria'>('usuarios');
  const [safeCount, setSafeCount] = useState<0 | 1 | 25>(0);
  const rows: FixtureRow[] = Array.from({ length: safeCount }, (_, index) => ({
    id: index + 1,
    name: source === 'usuarios' ? `Pessoa de teste ${index + 1}` : `Evento de teste ${index + 1}`,
    detail: source === 'usuarios' ? `perfil-${index % 3 + 1}` : `Configuração ${index % 5 + 1}`,
    status: index % 2 === 0 ? 'Ativo' : 'Pendente',
  }));
  const columns: AdminDataGridColumn<FixtureRow>[] = [
    { key: 'name', label: source === 'usuarios' ? 'Nome' : 'Evento', render: (row) => row.name },
    { key: 'detail', label: source === 'usuarios' ? 'Perfil' : 'Resumo', render: (row) => row.detail },
    { key: 'status', label: 'Estado', render: (row) => row.status },
  ];

  return (
    <div className="admin-console-grid-preview">
      <header><Link to={adminConsolePath('overview')}>← Visão geral</Link><h1>Prévia da grid administrativa</h1><p>Fixtures locais de desenvolvimento; nenhum dado de API é usado nesta página.</p></header>
      <div className="admin-grid-fixture-controls" aria-label="Configuração da fixture">
        <label>Fonte<select value={source} onChange={(event) => setSource(event.target.value === 'auditoria' ? 'auditoria' : 'usuarios')}><option value="usuarios">Usuários</option><option value="auditoria">Auditoria</option></select></label>
        <label>Registros<select value={safeCount} onChange={(event) => setSafeCount(Number(event.target.value) === 25 ? 25 : Number(event.target.value) === 1 ? 1 : 0)}><option value={0}>0 registros</option><option value={1}>1 registro</option><option value={25}>25 registros</option></select></label>
      </div>
      <AdminDataGrid columns={columns} rows={rows} rowKey={(row) => row.id} toolbar={<span>{source === 'usuarios' ? 'Usuários da fixture' : 'Eventos de auditoria da fixture'}</span>} footer={<><span>{safeCount} registros</span><span>Página 1 de 1</span></>} />
    </div>
  );
}
