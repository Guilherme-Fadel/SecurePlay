import { invalidateAdminResources } from '@/lib/adminCache';
import { api } from './api';

export interface TurmaResumo {
  id: number;
  nome: string;
  ano_letivo: number;
  ativa: boolean;
  professores: number;
  alunos: number;
  proxima_abertura: string | null;
}

export interface Paginado<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface AlunoDaTurma {
  id: number;
  name: string;
  nickname: string | null;
  entrou_em: string;
}

export interface ProfessorDaTurma {
  id: number;
  name: string;
  email: string;
}

export type EstadoEdicao = 'fechada' | 'agendada' | 'aberta';

export interface JornadaEdicao {
  turma: { id: number; nome: string; ano_letivo: number; ativa: boolean };
  resumo: {
    aulasAbertas: number;
    proximaAbertura: { aula_id: number; titulo: string; abre_em: string } | null;
  };
  modulos: Array<{
    modulo_id: number;
    titulo: string;
    posicao: number;
    aulas: Array<{ aula_id: number; titulo: string; ordem: number; estado: EstadoEdicao; abre_em: string | null }>;
  }>;
  catalogo: Array<{ modulo_id: number; titulo: string }>;
}

export type DefinirAbertura = { modo: 'agora' } | { modo: 'agendar'; abre_em: string };

export interface FiltrosTurmas {
  page?: number;
  pageSize?: number;
  busca?: string;
  ano_letivo?: number;
  situacao?: 'ativa' | 'arquivada';
}

export type DadosTurma = { nome: string; ano_letivo: number };

/** Gestão da escola do admin ou, com `empresaId`, da escola escolhida pela plataforma. */
export function turmaAdminPath(empresaId?: number): string {
  return empresaId === undefined ? '/admin/empresa/turmas' : `/platform/admin/empresas/${empresaId}/turmas`;
}

function mudou(empresaId?: number) {
  invalidateAdminResources(empresaId, 'classes', 'invitations', 'users', 'audit-events');
}

export async function listarTurmas(filtros: FiltrosTurmas, empresaId?: number): Promise<Paginado<TurmaResumo>> {
  return (await api.get(turmaAdminPath(empresaId), { params: filtros })).data;
}

export async function criarTurma(data: DadosTurma, empresaId?: number): Promise<TurmaResumo> {
  const result = await api.post(turmaAdminPath(empresaId), data);
  mudou(empresaId);
  return result.data;
}

export async function atualizarTurma(turmaId: number, data: DadosTurma, empresaId?: number): Promise<TurmaResumo> {
  const result = await api.put(`${turmaAdminPath(empresaId)}/${turmaId}`, data);
  mudou(empresaId);
  return result.data;
}

export async function arquivarTurma(turmaId: number, empresaId?: number): Promise<TurmaResumo> {
  const result = await api.post(`${turmaAdminPath(empresaId)}/${turmaId}/arquivar`);
  mudou(empresaId);
  return result.data;
}

export async function reativarTurma(turmaId: number, empresaId?: number): Promise<TurmaResumo> {
  const result = await api.post(`${turmaAdminPath(empresaId)}/${turmaId}/reativar`);
  mudou(empresaId);
  return result.data;
}

export async function listarProfessoresTurma(turmaId: number, empresaId?: number): Promise<ProfessorDaTurma[]> {
  return (await api.get(`${turmaAdminPath(empresaId)}/${turmaId}/professores`)).data;
}

export async function vincularProfessorTurma(turmaId: number, usuarioId: number, empresaId?: number): Promise<void> {
  await api.post(`${turmaAdminPath(empresaId)}/${turmaId}/professores`, { usuario_id: usuarioId });
  mudou(empresaId);
}

export async function desvincularProfessorTurma(turmaId: number, usuarioId: number, empresaId?: number): Promise<void> {
  await api.delete(`${turmaAdminPath(empresaId)}/${turmaId}/professores/${usuarioId}`);
  mudou(empresaId);
}

export async function listarAlunosTurma(turmaId: number, filtros: { page?: number; pageSize?: number; busca?: string }, empresaId?: number): Promise<Paginado<AlunoDaTurma>> {
  return (await api.get(`${turmaAdminPath(empresaId)}/${turmaId}/alunos`, { params: filtros })).data;
}

export async function adicionarAlunosTurma(turmaId: number, usuarioIds: number[], empresaId?: number): Promise<{ adicionados: number; movidos: number }> {
  const result = await api.post(`${turmaAdminPath(empresaId)}/${turmaId}/alunos`, { usuario_ids: usuarioIds });
  mudou(empresaId);
  return result.data;
}

export async function removerAlunoTurma(turmaId: number, usuarioId: number, empresaId?: number): Promise<void> {
  await api.delete(`${turmaAdminPath(empresaId)}/${turmaId}/alunos/${usuarioId}`);
  mudou(empresaId);
}

export async function minhasTurmas(): Promise<TurmaResumo[]> {
  return (await api.get('/turmas/minhas')).data;
}

export async function obterJornada(turmaId: number): Promise<JornadaEdicao> {
  return (await api.get(`/turmas/${turmaId}/jornada`)).data;
}

export async function salvarModulosJornada(turmaId: number, moduloIds: number[]): Promise<JornadaEdicao> {
  return (await api.put(`/turmas/${turmaId}/jornada/modulos`, { modulo_ids: moduloIds })).data;
}

export async function definirAberturaAula(turmaId: number, aulaId: number, data: DefinirAbertura): Promise<JornadaEdicao & { abertasEmCascata: number[] }> {
  return (await api.put(`/turmas/${turmaId}/jornada/aulas/${aulaId}/abertura`, data)).data;
}

export async function cancelarAberturaAula(turmaId: number, aulaId: number): Promise<JornadaEdicao> {
  return (await api.delete(`/turmas/${turmaId}/jornada/aulas/${aulaId}/abertura`)).data;
}

export async function listarAlunosDaJornada(turmaId: number, filtros: { page?: number; pageSize?: number; busca?: string }): Promise<Paginado<AlunoDaTurma>> {
  return (await api.get(`/turmas/${turmaId}/alunos`, { params: filtros })).data;
}
