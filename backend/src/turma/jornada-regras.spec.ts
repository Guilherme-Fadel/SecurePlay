import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import {
  AulaRef,
  EntradaJornada,
  ModuloRef,
  aulasEmOrdem,
  aulasParaAbrirAgora,
  resolverEstadoJornada,
  validarAgendamento,
  validarCancelamento,
} from './jornada-regras';

const agora = new Date('2026-11-18T10:00:00-03:00');
const antes = new Date('2026-11-17T08:00:00-03:00');
const depois = new Date('2026-11-20T08:00:00-03:00');
const muitoDepois = new Date('2026-11-25T08:00:00-03:00');

const aula = (id: number, modulo_id: number): AulaRef => ({
  id,
  modulo_id,
  titulo: `Aula ${id}`,
});
const m1: ModuloRef = { id: 1, aulas: [aula(11, 1), aula(12, 1)] };
const m2: ModuloRef = { id: 2, aulas: [aula(21, 2), aula(22, 2)] };
const ordem = aulasEmOrdem([m1, m2]);

function entrada(over: Partial<EntradaJornada> = {}): EntradaJornada {
  return {
    modulos: [m1, m2],
    foraDaJornada: [],
    aberturas: new Map(),
    progresso: new Map(),
    agora,
    ...over,
  };
}

function estado(e: EntradaJornada, aulaId: number) {
  return resolverEstadoJornada(e)
    .flatMap((m) => m.aulas)
    .find((a) => a.aulaId === aulaId)!;
}

function modulo(e: EntradaJornada, moduloId: number) {
  return resolverEstadoJornada(e).find((m) => m.moduloId === moduloId)!;
}

function falha(fn: () => unknown, tipo: new (...args: never[]) => Error, mensagem: string) {
  let erro: unknown;
  try {
    fn();
  } catch (e) {
    erro = e;
  }
  expect(erro).toBeInstanceOf(tipo);
  expect((erro as Error).message).toBe(mensagem);
}

describe('resolverEstadoJornada — estado das aulas', () => {
  it('aula concluída fica concluída mesmo fora da jornada', () => {
    const e = entrada({
      modulos: [m1],
      foraDaJornada: [m2],
      progresso: new Map([[21, { completed: true }]]),
    });
    expect(estado(e, 21)).toEqual({ aulaId: 21, status: 'completed', lockReason: null, opensAt: null });
  });

  it('aula começada continua acessível mesmo sem abertura', () => {
    const e = entrada({ progresso: new Map([[11, { completed: false }]]) });
    expect(estado(e, 11)).toEqual({ aulaId: 11, status: 'unlocked', lockReason: null, opensAt: null });
  });

  it('aula aberta com a anterior incompleta fica bloqueada pela sequência', () => {
    const e = entrada({ aberturas: new Map([[11, antes], [12, antes]]) });
    expect(estado(e, 11).status).toBe('unlocked');
    expect(estado(e, 12)).toMatchObject({ status: 'locked', lockReason: 'sequence', opensAt: null });
  });

  it('aula agendada no futuro informa quando abre', () => {
    const e = entrada({ aberturas: new Map([[11, depois]]) });
    expect(estado(e, 11)).toEqual({ aulaId: 11, status: 'locked', lockReason: 'scheduled', opensAt: depois });
  });

  it('aula sem abertura aguarda o professor', () => {
    expect(estado(entrada(), 11)).toMatchObject({ status: 'locked', lockReason: 'awaiting_teacher' });
  });

  it('aula com abertura exatamente agora está aberta', () => {
    const e = entrada({ aberturas: new Map([[11, new Date(agora)]]) });
    expect(estado(e, 11).status).toBe('unlocked');
  });

  it('aula não começada de módulo fora da jornada fica fora da jornada', () => {
    const e = entrada({
      modulos: [m1],
      foraDaJornada: [m2],
      progresso: new Map([[21, { completed: true }]]),
      aberturas: new Map([[22, antes]]),
    });
    expect(estado(e, 22)).toMatchObject({ status: 'locked', lockReason: 'outside_journey' });
    expect(modulo(e, 2)).toMatchObject({ locked: false, outsideJourney: true });
  });

  it('devolve primeiro os módulos da jornada e depois os de fora', () => {
    const e = entrada({ modulos: [m2], foraDaJornada: [m1] });
    expect(resolverEstadoJornada(e).map((m) => m.moduloId)).toEqual([2, 1]);
  });
});

describe('resolverEstadoJornada — bloqueio de módulos', () => {
  it('bloqueia o módulo seguinte enquanto o anterior não termina', () => {
    const e = entrada({ aberturas: new Map([[11, antes], [21, antes]]) });
    expect(modulo(e, 2).locked).toBe(true);
    expect(estado(e, 21)).toMatchObject({ status: 'locked', lockReason: 'sequence' });
  });

  it('não bloqueia módulo em que o aluno já tem progresso', () => {
    const e = entrada({ progresso: new Map([[21, { completed: false }]]) });
    expect(modulo(e, 2).locked).toBe(false);
    expect(estado(e, 21).status).toBe('unlocked');
  });

  it('módulo sem aulas não trava o seguinte', () => {
    const vazio: ModuloRef = { id: 9, aulas: [] };
    const e = entrada({ modulos: [vazio, m1], aberturas: new Map([[11, antes]]) });
    expect(modulo(e, 1).locked).toBe(false);
    expect(estado(e, 11).status).toBe('unlocked');
  });

  it('libera o módulo seguinte quando o anterior termina', () => {
    const e = entrada({
      progresso: new Map([[11, { completed: true }], [12, { completed: true }]]),
      aberturas: new Map([[11, antes], [12, antes], [21, antes]]),
    });
    expect(modulo(e, 2).locked).toBe(false);
    expect(estado(e, 21).status).toBe('unlocked');
  });

  it('jornada sem módulos devolve lista vazia', () => {
    expect(resolverEstadoJornada(entrada({ modulos: [] }))).toEqual([]);
  });
});

describe('aulasParaAbrirAgora', () => {
  it('abre a aula e todas as anteriores fechadas', () => {
    expect(aulasParaAbrirAgora(ordem, 21, new Map(), agora)).toEqual([11, 12, 21]);
  });

  it('ignora as anteriores já abertas', () => {
    expect(aulasParaAbrirAgora(ordem, 21, new Map([[11, antes]]), agora)).toEqual([12, 21]);
  });

  it('antecipa anteriores agendadas no futuro', () => {
    expect(aulasParaAbrirAgora(ordem, 21, new Map([[11, antes], [12, depois]]), agora)).toEqual([12, 21]);
  });

  it('recusa aula que já está aberta', () => {
    falha(() => aulasParaAbrirAgora(ordem, 12, new Map([[12, antes]]), agora), ConflictException, 'Esta aula já está aberta');
  });

  it('recusa aula fora da jornada', () => {
    falha(() => aulasParaAbrirAgora(ordem, 99, new Map(), agora), NotFoundException, 'Aula não encontrada nesta jornada');
  });
});

describe('validarAgendamento', () => {
  const validar = (alvo: number, abreEm: Date, aberturas = new Map<number, Date>()) => () =>
    validarAgendamento(ordem, alvo, abreEm, aberturas, agora);

  it('aceita a primeira aula da jornada', () => {
    expect(validar(11, depois)).not.toThrow();
  });

  it('aceita quando a anterior já abriu', () => {
    expect(validar(12, depois, new Map([[11, antes]]))).not.toThrow();
  });

  it('recusa data que já passou', () => {
    falha(validar(11, antes), BadRequestException, 'Use abrir agora');
    falha(validar(11, new Date(agora)), BadRequestException, 'Use abrir agora');
  });

  it('recusa data além de 400 dias', () => {
    const longe = new Date(agora.getTime() + 401 * 86400000);
    falha(validar(11, longe), BadRequestException, 'Agende em até 400 dias');
  });

  it('exige abertura da aula anterior', () => {
    falha(validar(12, depois), BadRequestException, 'Abra ou agende a aula anterior primeiro');
  });

  it('recusa data anterior à abertura da aula anterior', () => {
    falha(validar(12, depois, new Map([[11, muitoDepois]])), BadRequestException, 'Abra ou agende a aula anterior primeiro');
  });

  it('recusa data posterior à abertura da aula seguinte', () => {
    falha(
      validar(12, muitoDepois, new Map([[11, antes], [21, depois]])),
      BadRequestException,
      'A aula seguinte abre antes; ajuste-a primeiro',
    );
  });

  it('recusa reagendar aula que já abriu', () => {
    falha(validar(11, depois, new Map([[11, antes]])), ConflictException, 'Esta aula já abriu');
  });

  it('recusa aula fora da jornada', () => {
    falha(validar(99, depois), NotFoundException, 'Aula não encontrada nesta jornada');
  });
});

describe('validarCancelamento', () => {
  it('permite cancelar o último agendamento', () => {
    expect(() => validarCancelamento(ordem, 12, new Map([[11, antes], [12, depois]]), agora)).not.toThrow();
  });

  it('recusa cancelar aula que já abriu', () => {
    falha(() => validarCancelamento(ordem, 11, new Map([[11, antes]]), agora), ConflictException, 'Esta aula já abriu');
  });

  it('recusa cancelar quando a seguinte tem abertura', () => {
    falha(
      () => validarCancelamento(ordem, 12, new Map([[12, depois], [21, muitoDepois]]), agora),
      BadRequestException,
      'Cancele primeiro as aulas seguintes',
    );
  });

  it('recusa cancelar aula sem agendamento', () => {
    falha(() => validarCancelamento(ordem, 12, new Map(), agora), ConflictException, 'Esta aula não tem agendamento');
  });
});
