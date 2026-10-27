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

test('completed video and comic do not attempt another progress write or show a misleading pending save', () => {
  for (const component of ['AulaVideo', 'AulaQuadrinho']) {
    const h = hooks();
    let saves = 0;
    let timers = 0;
    const lesson = { id: 7, type: component === 'AulaVideo' ? 'video' : 'quadrinho', completed: true,
      title: 'Concluída', progress: { percent: 100, lastVideoSecond: 20, lastPage: 0 }, pages: [], quiz: [] };
    const icons = Object.fromEntries(['CheckCircle2', 'Clock3', 'PlayCircle', 'Sparkles', 'BookOpen', 'ChevronLeft', 'ChevronRight', 'Info'].map((name) => [name, name]));
    const mod = load(`src/components/sections/HomePage/Conteudos/${component}.tsx`, {
      react: h.react, 'lucide-react': icons,
      'motion/react': { AnimatePresence: 'presence', motion: { div: 'motion-div' }, useReducedMotion: () => true },
      '@/components/ui/buttons/AppButton': { AppButton: 'button' },
      '@/hooks/useAula': { useAula: () => ({ aula: lesson, setAula() {}, loading: false }) },
      '@/hooks/useModulo': { useModulo: () => ({ modulo: null }) },
      '@/hooks/useAulaProgress': { useAulaProgress: () => ({ salvarProgresso: () => saves++, saveStatus: 'idle' }) },
      '@/hooks/usePageNavigation': { usePageNavigation: () => ({ currentPage: 0, goTo() {} }) },
      './LearningShell': { LearningShell: 'shell' }, './LessonNavigator': { LessonNavigator: 'navigator' },
      './ProgressSaveStatus': { ProgressSaveStatus: 'save-status' }, './AulaQuiz': { AulaQuiz: 'quiz' },
    }, { window: { setTimeout() { timers++; return 1; }, clearTimeout() {} } });
    h.render(() => mod[component]({ aulaId: 7, moduloId: 1, onBack() {}, onSelectAula() {} }));
    assert.equal(saves, 0, component);
    assert.equal(timers, 0, component);
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
  const lesson = { id: 7, type: 'video', title: 'Vídeo', description: 'Fixture', completed: false,
    progress: { percent: 35, lastVideoSecond: 20 }, duration: 1, xp: 12, content_url: null };
  const icons = Object.fromEntries(['CheckCircle2', 'Clock3', 'PlayCircle', 'Sparkles'].map((name) => [name, name]));
  const { AulaVideo } = load('src/components/sections/HomePage/Conteudos/AulaVideo.tsx', {
    react: h.react, 'lucide-react': icons,
    '@/components/ui/buttons/AppButton': { AppButton: 'button' },
    '@/hooks/useAula': { useAula: () => {
      const [aula, setAula] = h.react.useState(lesson);
      return { aula, setAula, loading: false };
    } },
    '@/hooks/useModulo': { useModulo: () => ({ modulo: null }) },
    '@/hooks/useAulaProgress': { useAulaProgress },
    './LearningShell': { LearningShell: 'shell' }, './LessonNavigator': { LessonNavigator: 'navigator' },
    './ProgressSaveStatus': { ProgressSaveStatus: 'save-status' },
  });
  const render = () => h.render(() => AulaVideo({ aulaId: 7, moduloId: 1, onBack() {}, onSelectAula() {} }));
  let tree = nodes(render());
  await tree.find((node) => node.type === 'button').props.onClick();
  tree = nodes(render());
  assert.ok(tree.some((node) => node.props.role === 'alert'));
  assert.equal(tree.find((node) => node.type === 'button').props.children, 'Tentar concluir novamente');
  assert.equal(invalidated, 0);
  await tree.find((node) => node.type === 'button').props.onClick();
  const completed = render();
  assert.equal(completed.props.progress, 100);
  assert.equal(completed.props.progressLabel, 'Aula concluída');
  assert.equal(nodes(completed).filter((node) => node.type === 'button').length, 0);
  assert.equal(nodes(completed).some((node) => node.props.role === 'alert'), false);
  assert.equal(invalidated, 1);
  assert.equal(requests, 2);
});
