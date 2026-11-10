import { useState } from 'react';
import { UserMinus } from 'lucide-react';
import { AppButton } from '@/components/ui/buttons/AppButton';
import { AppSelect } from '@/components/ui/forms/AppSelect';
import { Modal } from '@/components/ui/modal';
import { AdminListToolbar } from '@/components/admin/AdminListLayout';
import { AdminDataGrid } from '@/components/admin/console/AdminDataGrid';
import { useCachedQuery } from '@/hooks/useCachedQuery';
import { adminQueryKey } from '@/lib/adminCache';
import { listarUsuarios } from '@/services/convites';
import { desvincularProfessorTurma, listarProfessoresTurma, vincularProfessorTurma, type ProfessorDaTurma } from '@/services/turmas';
import { mensagemDeErro, type EscopoTurmas } from './turmaUi';
import { AdminFeedback } from '@/components/admin/console/AdminFeedback';

/** Professores vinculados (gestão): vincular contas `teacher` da escola e desvincular com confirmação. */
export function TurmaProfessoresTab({ escopo, turmaId, ativa }: { escopo: EscopoTurmas; turmaId: number; ativa: boolean }) {
  const vinculados = useCachedQuery(adminQueryKey('classes', escopo.empresaId, { turmaId, professores: true }), () => listarProfessoresTurma(turmaId, escopo.empresaId));
  const contas = useCachedQuery(adminQueryKey('users', escopo.empresaId, { papel: 'teacher', pageSize: 100 }), () => listarUsuarios({ page: 1, pageSize: 100, papel: 'teacher', status: 'active' }, escopo.empresaId));
  const [selecionado, setSelecionado] = useState('');
  const [ocupado, setOcupado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [remover, setRemover] = useState<ProfessorDaTurma | null>(null);
  const ids = new Set((vinculados.data ?? []).map((professor) => professor.id));
  const disponiveis = (contas.data?.items ?? []).filter((conta) => !ids.has(conta.id));

  const executar = async (acao: () => Promise<void>, padrao: string) => {
    setOcupado(true);
    setErro(null);
    try {
      await acao();
      vinculados.refetch();
    } catch (error) {
      setErro(mensagemDeErro(error, padrao));
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section aria-label="Professores da turma">
      {erro && <AdminFeedback variant="error">{erro}</AdminFeedback>}
      <AdminDataGrid
        columns={[
          { key: 'nome', label: 'Professor', render: (professor) => professor.name },
          { key: 'email', label: 'E-mail', render: (professor) => professor.email },
          { key: 'acoes', label: 'Ações', render: (professor) => <AppButton variant="ghost" size="sm" icon={<UserMinus size={14} aria-hidden="true" />} disabled={!ativa || ocupado} onClick={() => setRemover(professor)}>Desvincular</AppButton> },
        ]}
        rows={vinculados.data ?? []}
        rowKey={(professor) => professor.id}
        loading={vinculados.loading}
        error={vinculados.error ? 'Não foi possível carregar os professores.' : undefined}
        onRetry={vinculados.refetch}
        empty="Nenhum professor vinculado. Convide professores em Pessoas › Convites."
        toolbar={ativa ? <AdminListToolbar className="turma-professores-toolbar">
          <AppSelect aria-label="Professor para vincular" value={selecionado} disabled={ocupado || contas.loading} onChange={(event) => setSelecionado(event.target.value)}>
            <option value="">{disponiveis.length ? 'Escolha um professor' : 'Nenhum professor disponível'}</option>
            {disponiveis.map((conta) => <option key={conta.id} value={String(conta.id)}>{conta.name}</option>)}
          </AppSelect>
          <AppButton size="control" disabled={!selecionado || ocupado} onClick={() => void executar(async () => { await vincularProfessorTurma(turmaId, Number(selecionado), escopo.empresaId); setSelecionado(''); }, 'Não foi possível vincular o professor.')}>Vincular</AppButton>
        </AdminListToolbar> : undefined}
      />
      <Modal open={remover !== null} onClose={() => setRemover(null)} title="Desvincular professor?" maxWidth="440px">
        <p>{remover?.name} deixa de editar a jornada desta turma.</p>
        <div className="admin-console-setting-actions">
          <AppButton variant="ghost" onClick={() => setRemover(null)}>Cancelar</AppButton>
          <AppButton disabled={ocupado} onClick={() => { const alvo = remover; setRemover(null); if (alvo) void executar(() => desvincularProfessorTurma(turmaId, alvo.id, escopo.empresaId), 'Não foi possível desvincular o professor.'); }}>Desvincular</AppButton>
        </div>
      </Modal>
    </section>
  );
}
