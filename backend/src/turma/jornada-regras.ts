import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Regras da jornada da turma sem I/O. Quem chama entrega módulos e aulas
 * ativos já ordenados e o relógio da aplicação (`agora`); nunca o do banco.
 */
export type LockReason =
  | 'sequence'
  | 'scheduled'
  | 'awaiting_teacher'
  | 'outside_journey';

export interface AulaRef {
  id: number;
  modulo_id: number;
  titulo: string;
}

export interface ModuloRef {
  id: number;
  aulas: AulaRef[];
}

export interface EntradaJornada {
  modulos: ModuloRef[];
  foraDaJornada: ModuloRef[];
  aberturas: Map<number, Date>;
  progresso: Map<number, { completed: boolean }>;
  agora: Date;
}

export interface EstadoAula {
  aulaId: number;
  status: 'completed' | 'unlocked' | 'locked';
  lockReason: LockReason | null;
  opensAt: Date | null;
}

export interface EstadoModulo {
  moduloId: number;
  locked: boolean;
  outsideJourney: boolean;
  aulas: EstadoAula[];
}

const LIMITE_AGENDAMENTO_DIAS = 400;

function aberta(abreEm: Date | undefined, agora: Date): boolean {
  return abreEm !== undefined && abreEm.getTime() <= agora.getTime();
}

function estadosDasAulas(
  modulo: ModuloRef,
  bloqueado: boolean,
  foraDaJornada: boolean,
  e: EntradaJornada,
): EstadoAula[] {
  let anterioresConcluidas = true;
  return modulo.aulas.map((aula) => {
    const progresso = e.progresso.get(aula.id);
    const base = { aulaId: aula.id, lockReason: null, opensAt: null };
    let estado: EstadoAula;
    if (progresso?.completed) estado = { ...base, status: 'completed' };
    else if (progresso) estado = { ...base, status: 'unlocked' };
    else if (foraDaJornada)
      estado = { ...base, status: 'locked', lockReason: 'outside_journey' };
    else if (bloqueado || !anterioresConcluidas)
      estado = { ...base, status: 'locked', lockReason: 'sequence' };
    else {
      const abreEm = e.aberturas.get(aula.id);
      if (!abreEm)
        estado = { ...base, status: 'locked', lockReason: 'awaiting_teacher' };
      else if (aberta(abreEm, e.agora)) estado = { ...base, status: 'unlocked' };
      else
        estado = {
          ...base,
          status: 'locked',
          lockReason: 'scheduled',
          opensAt: abreEm,
        };
    }
    anterioresConcluidas = anterioresConcluidas && !!progresso?.completed;
    return estado;
  });
}

/** Estado de cada módulo e aula para um aluno com turma (tabela da seção 6 da spec). */
export function resolverEstadoJornada(e: EntradaJornada): EstadoModulo[] {
  const resultado: EstadoModulo[] = [];
  let anteriorConcluido = true;
  for (const modulo of e.modulos) {
    const temProgresso = modulo.aulas.some((aula) => e.progresso.has(aula.id));
    const locked = !anteriorConcluido && !temProgresso;
    resultado.push({
      moduloId: modulo.id,
      locked,
      outsideJourney: false,
      aulas: estadosDasAulas(modulo, locked, false, e),
    });
    // Módulo sem aulas ativas não trava a cadeia.
    const concluido = modulo.aulas.every(
      (aula) => e.progresso.get(aula.id)?.completed,
    );
    anteriorConcluido = anteriorConcluido && concluido;
  }
  for (const modulo of e.foraDaJornada) {
    resultado.push({
      moduloId: modulo.id,
      locked: false,
      outsideJourney: true,
      aulas: estadosDasAulas(modulo, false, true, e),
    });
  }
  return resultado;
}

export function aulasEmOrdem(modulos: ModuloRef[]): AulaRef[] {
  return modulos.flatMap((modulo) => modulo.aulas);
}

function posicao(ordem: AulaRef[], alvoId: number): number {
  const index = ordem.findIndex((aula) => aula.id === alvoId);
  if (index < 0)
    throw new NotFoundException('Aula não encontrada nesta jornada');
  return index;
}

/** Ids a abrir em "Abrir agora": a aula alvo e as anteriores ainda fechadas ou agendadas. */
export function aulasParaAbrirAgora(
  ordem: AulaRef[],
  alvoId: number,
  aberturas: Map<number, Date>,
  agora: Date,
): number[] {
  const index = posicao(ordem, alvoId);
  if (aberta(aberturas.get(alvoId), agora))
    throw new ConflictException('Esta aula já está aberta');
  return ordem
    .slice(0, index + 1)
    .filter((aula) => !aberta(aberturas.get(aula.id), agora))
    .map((aula) => aula.id);
}

export function validarAgendamento(
  ordem: AulaRef[],
  alvoId: number,
  abreEm: Date,
  aberturas: Map<number, Date>,
  agora: Date,
): void {
  const index = posicao(ordem, alvoId);
  if (aberta(aberturas.get(alvoId), agora))
    throw new ConflictException('Esta aula já abriu');
  if (abreEm.getTime() <= agora.getTime())
    throw new BadRequestException('Use abrir agora');
  if (
    abreEm.getTime() >
    agora.getTime() + LIMITE_AGENDAMENTO_DIAS * 24 * 60 * 60 * 1000
  )
    throw new BadRequestException('Agende em até 400 dias');
  const anterior = ordem[index - 1];
  if (anterior) {
    const abreAnterior = aberturas.get(anterior.id);
    if (!abreAnterior || abreAnterior.getTime() > abreEm.getTime())
      throw new BadRequestException('Abra ou agende a aula anterior primeiro');
  }
  const seguinte = ordem[index + 1];
  const abreSeguinte = seguinte ? aberturas.get(seguinte.id) : undefined;
  if (abreSeguinte && abreSeguinte.getTime() < abreEm.getTime())
    throw new BadRequestException(
      'A aula seguinte abre antes; ajuste-a primeiro',
    );
}

export function validarCancelamento(
  ordem: AulaRef[],
  alvoId: number,
  aberturas: Map<number, Date>,
  agora: Date,
): void {
  const index = posicao(ordem, alvoId);
  const abreEm = aberturas.get(alvoId);
  if (!abreEm) throw new ConflictException('Esta aula não tem agendamento');
  if (aberta(abreEm, agora)) throw new ConflictException('Esta aula já abriu');
  const seguinte = ordem[index + 1];
  if (seguinte && aberturas.has(seguinte.id))
    throw new BadRequestException('Cancele primeiro as aulas seguintes');
}
