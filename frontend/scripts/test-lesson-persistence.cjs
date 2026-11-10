const assert = require('node:assert/strict');
const React = require('react');
const { test } = require('node:test');
const { load, hooks, settle, deferred } = require('./helpers/react-hooks.cjs');

function progressFixture() {
  const h = hooks();
  const calls = [];
  const invalidated = [];
  const services = { updateAulaProgress(id, payload) {
    const request = deferred();
    calls.push({ id, payload, ...request });
    return request.promise;
  } };
  const { useProgressSave } = load('src/hooks/useProgressSave.ts', {
    react: h.react,
    '@/services/conteudo': services,
    '@/lib/queryCache': { invalidate: (key) => invalidated.push(key) },
  });
  return { h, calls, invalidated, services, useProgressSave, render: () => h.render(useProgressSave) };
}

test('lesson progress hook exposes a failed save and lets the view retry it', async () => {
  const f = progressFixture();
  const { useAulaProgress } = load('src/hooks/useAulaProgress.ts', {
    react: f.h.react, axios: { isAxiosError: () => false },
    '@/services/conteudo': f.services,
    '@/lib/queryCache': { invalidate() {} },
    '@/lib/progressCache': { invalidateProgress() {} },
    './useProgressSave': { useProgressSave: f.useProgressSave },
  });
  const render = () => f.h.render(useAulaProgress);
  const pending = render().salvarProgresso(7, { last_page: 3 });
  f.calls[0].reject(new Error('offline')); await pending;
  assert.equal(render().saveStatus, 'pending');
  const retry = render().retryProgress();
  f.calls[1].resolve({ lastPage: 3 }); await retry;
  assert.equal(render().saveStatus, 'saved');
});

test('save failure is pending; manual retry keeps the latest local point and only success invalidates cache', async () => {
  const f = progressFixture();
  const value = f.render();
  const saving = value.salvarProgresso(7, { last_page: 2, progress_percent: 40 });
  assert.equal(f.render().saveStatus, 'saving');
  f.calls[0].reject(new Error('offline'));
  await saving;
  assert.equal(f.render().saveStatus, 'pending');
  assert.equal(f.invalidated.length, 0);
  const retry = f.render().retryProgress();
  assert.equal(f.calls[1].payload.last_page, 2);
  f.calls[1].resolve({ lastPage: 2 });
  await retry;
  assert.equal(f.render().saveStatus, 'saved');
  assert.deepEqual(f.invalidated, ['conteudoModulos', 'dashboardJourney']);
  await f.render().retryProgress();
  assert.equal(f.calls.length, 2);
});

test('saves are serialized and intermediate points are coalesced; failed old request never wins a retry', async () => {
  const f = progressFixture();
  const v = f.render();
  const pending = v.salvarProgresso(7, { last_video_second: 10 });
  void v.salvarProgresso(7, { last_video_second: 20 });
  void v.salvarProgresso(7, { last_video_second: 30 });
  assert.equal(f.calls.length, 1);
  f.calls[0].reject(new Error('old failed'));
  await settle();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].payload.last_video_second, 30);
  f.calls[1].reject(new Error('latest failed'));
  await pending;
  assert.equal(f.render().saveStatus, 'pending');
  const retry = f.render().retryProgress();
  assert.equal(f.calls[2].payload.last_video_second, 30);
  f.calls[2].resolve({ lastVideoSecond: 30 });
  await retry;
  assert.equal(f.render().saveStatus, 'saved');
});

test('newer edits wait for old success and can intentionally return to an earlier page', async () => {
  const f = progressFixture();
  const v = f.render();
  const request = v.salvarProgresso(7, { last_page: 8, progress_percent: 90 });
  void v.salvarProgresso(7, { last_page: 3, progress_percent: 90 });
  f.calls[0].resolve({ lastPage: 8 }); await settle();
  assert.equal(f.render().saveStatus, 'saving');
  assert.equal(f.calls[1].payload.last_page, 3);
  f.calls[1].resolve({ lastPage: 3 }); await request;
  assert.equal(f.render().saveStatus, 'saved');
});

test('unmount discards queued work; completion discards pending retry without resurrecting stale state', async () => {
  const f = progressFixture();
  const v = f.render();
  const request = v.salvarProgresso(7, { last_page: 1 });
  void v.salvarProgresso(7, { last_page: 2 });
  v.discardProgress();
  f.calls[0].resolve({ lastPage: 1 }); await request;
  assert.equal(f.render().saveStatus, 'idle');
  await f.render().retryProgress();
  assert.equal(f.calls.length, 1);
  const request2 = v.salvarProgresso(7, { last_page: 3 });
  void v.salvarProgresso(7, { last_page: 4 });
  f.h.unmount();
  const before = f.invalidated.length;
  f.calls[1].resolve({ lastPage: 3 }); await request2;
  assert.equal(f.invalidated.length, before + 2, 'late success still refreshes the next screen cache');
  await v.retryProgress();
  assert.equal(f.calls.length, 2);
});

test('a new save queued while a discarded request settles is still sent', async () => {
  const f = progressFixture();
  const v = f.render();
  const old = v.salvarProgresso(7, { last_page: 1 });
  v.discardProgress();
  void v.salvarProgresso(7, { last_page: 9 });
  f.calls[0].resolve({ lastPage: 1 }); await old; await settle();
  assert.equal(f.calls.length, 2);
  assert.equal(f.calls[1].payload.last_page, 9);
  f.calls[1].resolve({ lastPage: 9 }); await settle();
  assert.equal(f.render().saveStatus, 'saved');
});

test('empty listener sets are released without removing live subscribers or a replacement subscription', () => {
  const maps = [];
  class ObservedMap extends Map { constructor(...args) { super(...args); maps.push(this); } }
  const cache = load('src/lib/queryCache.ts', {}, { Map: ObservedMap });
  let calls = 0;
  const old = cache.subscribe('lesson:7', () => calls++);
  const remaining = cache.subscribe('lesson:7', () => calls++);
  old(); cache.setCache('lesson:7', true);
  assert.equal(calls, 1);
  remaining();
  assert.equal(maps[1].size, 0);
  const replacement = cache.subscribe('lesson:7', () => calls++);
  old(); remaining();
  cache.setCache('lesson:7', false);
  assert.equal(calls, 2);
  replacement();
  for (let i = 0; i < 100; i++) cache.subscribe(`lesson:${i}`, () => {})();
  assert.equal(maps[1].size, 0);
});

function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes), ...nodes(node.props?.footer)];
}

test('progress notice exposes saving/saved/pending, with retry only when pending', () => {
  let retries = 0;
  const { ProgressSaveStatus } = load('src/components/sections/HomePage/Conteudos/ProgressSaveStatus.tsx', {
    '@/components/ui/buttons/AppButton': { AppButton: 'button' },
  });
  assert.equal(ProgressSaveStatus({ status: 'idle', onRetry() {} }), null);
  for (const status of ['saving', 'saved', 'pending']) {
    const tree = nodes(ProgressSaveStatus({ status, onRetry: () => retries++ }));
    assert.ok(tree.some((node) => node.props.role === 'status'));
    const buttons = tree.filter((node) => node.type === 'button');
    assert.equal(buttons.length, status === 'pending' ? 1 : 0);
    buttons[0]?.props.onClick();
  }
  assert.equal(retries, 1);
});

// Dependências da casca nova da aula: componentes visuais viram tags; helpers puros são carregados de verdade.
function lessonDependencies(h, overrides) {
  const lessonOrder = load('src/lib/lessonOrder.ts', {});
  const lessonContext = load('src/components/sections/HomePage/Conteudos/lessonContext.ts', {
    '@/lib/lessonOrder': lessonOrder,
  });
  const icons = new Proxy({}, { get: (_, name) => String(name), has: () => true });
  return {
    react: h.react, 'lucide-react': icons,
    '@/components/ui/buttons/AppButton': { AppButton: 'button' },
    '@/components/shared/ContentLoading': { ContentLoading: 'content-loading' },
    '@/hooks/useModulo': { useModulo: () => ({ modulo: null, refetch: async () => {} }) },
    '@/hooks/usePageNavigation': { usePageNavigation: () => ({ currentPage: 0, goTo() {} }) },
    './LearningShell': { LearningShell: 'shell' }, './LessonNavigator': { LessonNavigator: 'navigator' },
    './ProgressSaveStatus': { ProgressSaveStatus: 'save-status' }, './AulaQuiz': { AulaQuiz: 'quiz' },
    './LessonCheckpoint': { LessonCheckpoint: 'checkpoint' }, './LessonState': { LessonState: 'lesson-state' },
    './LessonStepper': { LessonStepper: 'stepper' },
    './useCanonicalLearnPath': { useCanonicalLearnPath() {} },
    './lessonFocus': { useLessonStepFocus: () => ({ headingRef: { current: null }, arm() {} }) },
    './lessonContext': lessonContext,
    './lessonStepItems': load('src/components/sections/HomePage/Conteudos/lessonStepItems.ts', {}),
    ...overrides,
  };
}

const label = (node) => [node.props?.children].flat().join('');
const findButton = (tree, pattern) => tree.find((node) => node.type === 'button' && pattern.test(label(node)));

test('completed video and comic do not attempt another progress write or show a misleading pending save', () => {
  for (const component of ['AulaVideo', 'AulaQuadrinho']) {
    const h = hooks();
    let saves = 0;
    let timers = 0;
    const lesson = { id: 7, type: component === 'AulaVideo' ? 'video' : 'quadrinho', completed: true,
      title: 'Concluída', progress: { percent: 100, lastVideoSecond: 20, lastPage: 0 }, pages: [], quiz: [] };
    const mod = load(`src/components/sections/HomePage/Conteudos/${component}.tsx`, lessonDependencies(h, {
      '@/hooks/useAula': { useAula: () => ({ aula: lesson, setAula() {}, loading: false }) },
      '@/hooks/useAulaProgress': { useAulaProgress: () => ({ salvarProgresso: () => saves++, saveStatus: 'idle' }) },
    }), { window: { setTimeout() { timers++; return 1; }, clearTimeout() {} } });
    const tree = nodes(h.render(() => mod[component]({ aulaId: 7, moduloId: 1, onBack() {}, onSelectAula() {} })));
    assert.equal(saves, 0, component);
    assert.equal(timers, 0, component);
    assert.equal(findButton(tree, /concluir/i), undefined, `${component} offers no second completion`);
  }
});

test('video completion failure stays actionable; retry recovers a server-committed result and shows success only then', async () => {
  const h = hooks();
  let requests = 0;
  let invalidated = 0;
  const result = { sucesso: true, mensagem: 'ok', xp_ganho: 12 };
  const save = { salvarProgresso: async () => {}, retryProgress() {}, discardProgress() {}, saveStatus: 'saved' };
  const { useAulaProgress } = load('src/hooks/useAulaProgress.ts', {
    react: h.react,
    axios: { isAxiosError: () => false },
    '@/services/conteudo': { concluirAula: async () => {
      requests++;
      if (requests === 1) throw new Error('response lost after server commit');
      return result;
    } },
    '@/lib/progressCache': { invalidateProgress: () => invalidated++ },
    '@/lib/queryCache': { invalidate() {} },
    './useProgressSave': { useProgressSave: () => save },
  });
  const lesson = { id: 7, type: 'video', title: 'Vídeo', description: 'Fixture', completed: false, section_name: null,
    progress: { percent: 35, lastVideoSecond: 20 }, duration: 1, xp: 12, content_url: null };
  const { AulaVideo } = load('src/components/sections/HomePage/Conteudos/AulaVideo.tsx', lessonDependencies(h, {
    '@/hooks/useAula': { useAula: () => {
      const [aula, setAula] = h.react.useState(lesson);
      return { aula, setAula, loading: false };
    } },
    '@/hooks/useAulaProgress': { useAulaProgress },
  }));
  const render = () => h.render(() => AulaVideo({ aulaId: 7, moduloId: 1, onBack() {}, onSelectAula() {} }));
  let tree = nodes(render());
  await findButton(tree, /^Concluir aula$/).props.onClick();
  tree = nodes(render());
  assert.ok(tree.some((node) => node.props.role === 'alert'));
  assert.ok(findButton(tree, /^Tentar concluir novamente$/));
  assert.equal(invalidated, 0);
  await findButton(tree, /^Tentar concluir novamente$/).props.onClick();
  const completed = render();
  tree = nodes(completed);
  assert.equal(completed.props.progress, 100);
  assert.equal(completed.props.progressLabel, 'Aula concluída');
  assert.equal(findButton(tree, /concluir/i), undefined);
  assert.equal(tree.some((node) => node.props.role === 'alert'), false);
  const checkpoint = tree.find((node) => node.type === 'checkpoint');
  assert.equal(checkpoint.props.xp, 12, 'XP shown is the server result');
  assert.equal(invalidated, 1);
  assert.equal(requests, 2);
});

test('lesson load failures distinguish denied (403), missing (404) and retryable errors', async () => {
  for (const [status, kind] of [[403, 'denied'], [404, 'missing'], [500, 'failed'], [undefined, 'failed']]) {
    const h = hooks();
    const error = { response: status ? { status, data: { message: status === 403 ? 'Conclua a aula anterior' : '' } } : undefined };
    const { useAula } = load('src/hooks/useAula.ts', {
      react: h.react,
      axios: { isAxiosError: (value) => value === error },
      '@/services/conteudo': { getAula: async () => { throw error; } },
    });
    h.render(() => useAula(7));
    await settle();
    const value = h.render(() => useAula(7));
    assert.equal(value.errorKind, kind, String(status));
    assert.equal(value.loading, false);
    if (kind === 'denied') assert.equal(value.error, 'Conclua a aula anterior');
  }
});

// ---------- Etapas da aula em texto (lessonSteps.ts) ----------
const { buildLessonSteps } = load('src/components/sections/HomePage/Conteudos/lessonSteps.ts', {});
const pilotPages = [
  'Entenda o tema\n\nUma senha longa protege cada conta.\n\nObjetivo: Criar senhas longas.',
  'Situação para pensar\n\nUm jogo pede uma conta nova.\n\nSinal de alerta: reutilizar a mesma senha.',
  'Como agir\n\nUse frases-senha longas.',
  'Peça apoio e reflita\n\nUma ação recomendada é pedir ajuda.\n\nVocê consegue criar senhas diferentes?',
];
const plain = (value) => JSON.parse(JSON.stringify(value));

test('pilot pages become Entenda/Situação/Como agir/Reflita with goal, alert and reflection taken from the text', () => {
  const { structured, steps } = plain(buildLessonSteps(pilotPages));
  assert.equal(structured, true);
  assert.deepEqual(steps.map((step) => step.label), ['Entenda', 'Situação', 'Como agir', 'Reflita']);
  assert.deepEqual(steps.map((step) => step.heading), ['Entenda o tema', 'Situação para pensar', 'Como agir', 'Peça apoio e reflita']);
  assert.deepEqual(steps[0].blocks, [{ kind: 'paragraph', text: 'Uma senha longa protege cada conta.' }, { kind: 'goal', text: 'Criar senhas longas.' }]);
  assert.deepEqual(steps[1].blocks[1], { kind: 'alert', text: 'Reutilizar a mesma senha.' });
  assert.deepEqual(steps[2].blocks, [{ kind: 'paragraph', text: 'Use frases-senha longas.' }]);
  assert.deepEqual(steps[3].blocks.map((block) => block.kind), ['paragraph', 'question']);
  const allText = steps.flatMap((step) => [step.heading, ...step.blocks.map((block) => block.text)]).join(' ');
  assert.equal(/Alex/.test(allText), false, 'no invented names or content');
});

test('anything outside the pilot pattern falls back to one plain step per page, keeping page indexes', () => {
  for (const pages of [
    ['Primeiro parágrafo.\n\nSegundo parágrafo.', '', 'Objetivo: só texto.'],
    [...pilotPages.slice(0, 3), 'Outro título\n\nTexto.'],
    pilotPages.slice(0, 3),
    [...pilotPages, 'Extra'],
    ['Entenda o tema', ...pilotPages.slice(1)],
  ]) {
    const { structured, steps } = plain(buildLessonSteps(pages));
    assert.equal(structured, false);
    assert.equal(steps.length, pages.length);
    assert.deepEqual(steps.map((step) => step.label), pages.map((_, i) => `Página ${i + 1}`));
    assert.ok(steps.every((step) => step.heading === null && step.blocks.every((block) => block.kind === 'paragraph')));
  }
  const fallback = plain(buildLessonSteps(['Primeiro parágrafo.\n\nSegundo parágrafo.', '   ']));
  assert.deepEqual(fallback.steps[0].blocks.map((block) => block.text), ['Primeiro parágrafo.', 'Segundo parágrafo.']);
  assert.deepEqual(fallback.steps[1].blocks, []);
  assert.deepEqual(plain(buildLessonSteps(null)), { structured: false, steps: [] });
  assert.equal(plain(buildLessonSteps(pilotPages.map((page) => page.replace(/\n/g, '\r\n')))).structured, true);
});

test('every pilot lesson in the editorial file matches the structured pattern', (t) => {
  const file = require('node:path').join(__dirname, '../../backend/scripts/data/pilot-lessons-2026.json');
  if (!require('node:fs').existsSync(file)) return t.skip('pilot file not present');
  const { lessons } = JSON.parse(require('node:fs').readFileSync(file, 'utf8'));
  for (const lesson of lessons) {
    const { structured, steps } = plain(buildLessonSteps(lesson.pages));
    assert.equal(structured, true, lesson.title);
    assert.ok(steps[0].blocks.some((block) => block.kind === 'goal'), lesson.title);
    assert.ok(steps[1].blocks.some((block) => block.kind === 'alert'), lesson.title);
    assert.ok(steps[3].blocks.some((block) => block.kind === 'question'), lesson.title);
  }
});
