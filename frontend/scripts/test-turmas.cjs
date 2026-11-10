// Horário de Brasília e textos de bloqueio das turmas, sem depender do fuso da máquina.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

const modules = new Map();
function load(relative) {
  if (modules.has(relative)) return modules.get(relative);
  const source = fs.readFileSync(path.join(__dirname, '..', relative), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, Date, Number, String, Math, RegExp, Error, require: (name) => {
    if (name === '@/lib/brasiliaTime') return load('src/lib/brasiliaTime.ts');
    throw new Error(`Import inesperado: ${name}`);
  } });
  modules.set(relative, module.exports);
  return module.exports;
}

for (const fuso of ['America/New_York', 'Asia/Tokyo', 'America/Sao_Paulo']) {
  test(`horário de Brasília independe do fuso do navegador (${fuso})`, () => {
    const anterior = process.env.TZ;
    process.env.TZ = fuso;
    try {
      const { brasiliaLocalToIso, isoToBrasiliaLocal, formatarAbertura } = load('src/lib/brasiliaTime.ts');
      assert.equal(brasiliaLocalToIso('2026-11-18T08:00'), '2026-11-18T08:00:00-03:00');
      assert.equal(isoToBrasiliaLocal('2026-11-18T11:00:00Z'), '2026-11-18T08:00');
      assert.equal(isoToBrasiliaLocal('2026-11-18T08:00:00-03:00'), '2026-11-18T08:00');
      assert.equal(formatarAbertura('2026-11-18T08:00:00-03:00'), '18/11 às 8h');
      assert.equal(formatarAbertura('2026-11-18T08:30:00-03:00'), '18/11 às 8h30');
      assert.equal(formatarAbertura('2026-12-01T02:05:00Z'), '30/11 às 23h05');
    } finally {
      if (anterior === undefined) delete process.env.TZ;
      else process.env.TZ = anterior;
    }
  });
}

test('recusa horário em formato inesperado', () => {
  const { brasiliaLocalToIso } = load('src/lib/brasiliaTime.ts');
  assert.throws(() => brasiliaLocalToIso('18/11/2026 08:00'));
  assert.throws(() => brasiliaLocalToIso(''));
});

test('texto de bloqueio por motivo', () => {
  const { textoDeBloqueio } = load('src/components/sections/HomePage/Conteudos/lockCopy.ts');
  assert.equal(textoDeBloqueio('scheduled', '2026-11-18T08:00:00-03:00'), 'Abre em 18/11 às 8h');
  assert.equal(textoDeBloqueio('awaiting_teacher', null), 'Aguardando o professor');
  assert.equal(textoDeBloqueio('outside_journey', null), 'Fora da jornada da turma');
  assert.equal(textoDeBloqueio('sequence', null), 'Conclua as aulas anteriores para liberar esta aula.');
  assert.equal(textoDeBloqueio(null, null, 'conclua o módulo anterior para liberar'), 'conclua o módulo anterior para liberar');
  assert.equal(textoDeBloqueio('scheduled', null), 'Conclua as aulas anteriores para liberar esta aula.');
});

function carregarHookJornada() {
  const chamadas = { invalidate: [], toast: [], eventos: [] };
  const ouvintes = new Map();
  const janela = {
    addEventListener(nome, fn) { ouvintes.set(nome, [...(ouvintes.get(nome) ?? []), fn]); },
    removeEventListener(nome, fn) { ouvintes.set(nome, (ouvintes.get(nome) ?? []).filter((item) => item !== fn)); },
    dispatchEvent(evento) { chamadas.eventos.push(evento.type); for (const fn of ouvintes.get(evento.type) ?? []) fn(evento); return true; },
  };
  const limpezas = [];
  const source = fs.readFileSync(path.join(__dirname, '..', 'src/hooks/useJornadaAtualizada.ts'), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, window: janela,
    document: { visibilityState: 'visible', addEventListener() {}, removeEventListener() {} },
    CustomEvent: class { constructor(type) { this.type = type; } },
    require: (name) => {
      if (name === 'react') return { useEffect: (fn) => { const limpar = fn(); if (limpar) limpezas.push(limpar); } };
      if (name === 'sonner') return { toast: (texto) => chamadas.toast.push(texto) };
      if (name === '@/lib/queryCache') return { invalidate: (chave) => chamadas.invalidate.push(chave) };
      throw new Error(`Import inesperado: ${name}`);
    },
  });
  return { hook: module.exports, chamadas, janela, limpezas };
}

function socketFalso() {
  const ouvintes = new Map();
  return {
    ouvintes,
    on(nome, fn) { ouvintes.set(nome, fn); },
    off(nome, fn) { if (ouvintes.get(nome) === fn) ouvintes.delete(nome); },
  };
}

test('aviso de jornada recarrega a trilha, avisa o módulo aberto e anuncia cada aula aberta', () => {
  const { hook, chamadas, limpezas } = carregarHookJornada();
  const socket = socketFalso();
  hook.useJornadaAtualizada(socket, true);
  socket.ouvintes.get('jornada-atualizada')({ turmaId: 4, aulasAbertas: [{ id: 11, titulo: 'Senhas fortes' }, { id: 12, titulo: 'Frase-senha' }] });
  assert.deepEqual([...chamadas.invalidate], ['conteudoModulos', 'dashboardJourney']);
  assert.deepEqual([...chamadas.eventos], ['secureplay:jornada-atualizada']);
  assert.deepEqual([...chamadas.toast], ['Nova aula aberta: Senhas fortes', 'Nova aula aberta: Frase-senha']);
  limpezas.forEach((limpar) => limpar());
  assert.equal(socket.ouvintes.has('jornada-atualizada'), false);
});

test('fora do papel de aluno o aviso de jornada não é escutado', () => {
  const { hook } = carregarHookJornada();
  const socket = socketFalso();
  hook.useJornadaAtualizada(socket, false);
  assert.equal(socket.ouvintes.size, 0);
});

test('módulo aberto recarrega quando a jornada da turma muda', () => {
  const { hook, janela, limpezas } = carregarHookJornada();
  let recargas = 0;
  hook.useAoAtualizarJornada(() => { recargas += 1; }, true);
  janela.dispatchEvent({ type: 'secureplay:jornada-atualizada' });
  assert.equal(recargas, 1);
  limpezas.forEach((limpar) => limpar());
  janela.dispatchEvent({ type: 'secureplay:jornada-atualizada' });
  assert.equal(recargas, 1);
});
