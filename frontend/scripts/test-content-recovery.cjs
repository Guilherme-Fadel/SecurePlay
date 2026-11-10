const assert = require('node:assert/strict');
const React = require('react');
const { test } = require('node:test');
const { load, hooks, settle, deferred } = require('./helpers/react-hooks.cjs');

test('route fallback registers the shared loader without creating another visual screen', () => {
  const pending = [];
  const { PageLoading } = load('src/components/shared/PageLoading.tsx', {
    '@/contexts/PageLoadingContext': { usePageLoading: (active) => pending.push(active) },
  });
  assert.equal(PageLoading(), null);
  assert.deepEqual(pending, [true]);
});

test('public and protected guards show loading while session is idle or loading, without rendering protected content', () => {
  let status = 'idle';
  const { PrivateRoute, PublicRoute } = load('src/routes/PrivateRoute.tsx', {
    react: { useEffect() {}, useState: () => [Date.now()] },
    'react-router-dom': { Navigate: 'navigate' },
    '@/hooks/useCurrentUser': { useCurrentUser: () => ({ status, ensureSession() {} }) },
    '@/components/admin/console/consoleNavigation': {},
    '@/components/ui/buttons/AppButton': {},
    '@/components/shared/PageLoading': { PageLoading: 'page-loading' },
  });
  for (status of ['idle', 'loading']) {
    for (const Guard of [PrivateRoute, PublicRoute]) {
      const view = Guard({ children: 'protected content' });
      assert.equal(view.type, 'page-loading');
      assert.equal(view.props.children, undefined);
    }
  }
});

test('session: network/503 preserve identity/cache, block protected route, retry; 401/403 clear session', async () => {
  const h = hooks();
  let response;
  let cleared = 0;
  const { CurrentUserProvider } = load('src/contexts/CurrentUserContext.tsx', {
    react: h.react, axios: { isAxiosError: (e) => e?.isAxiosError === true },
    '@/services/me': { getMe: () => response.promise },
    '@/lib/queryCache': { clearQueryCache: () => cleared++ },
    '@/config/features': { companySessionKey: (u) => u?.userId },
  }, { window: { setInterval: () => 1, clearInterval() {}, addEventListener() {}, removeEventListener() {} } });
  const render = () => h.render(() => CurrentUserProvider({ children: null })).props.value;
  let value = render();
  response = deferred();
  const initial = value.ensureSession();
  response.reject(new Error('offline'));
  await initial;
  value = render();
  assert.equal(value.status, 'unavailable');
  assert.equal(cleared, 0);
  response = deferred();
  const retry = value.refreshSession();
  response.resolve({ userId: 7 });
  await retry;
  value = render();
  assert.equal(value.status, 'authenticated');
  const before = cleared;
  response = deferred();
  const refresh = value.refreshSession();
  response.reject({ isAxiosError: true, response: { status: 503 } });
  await refresh;
  value = render();
  assert.equal(value.user.userId, 7);
  assert.equal(value.status, 'unavailable');
  assert.equal(cleared, before);
  const route = load('src/routes/PrivateRoute.tsx', {
    react: { ...React, useState: () => [Date.now()], useEffect() {} },
    'react-router-dom': { Navigate: 'navigate' },
    '@/hooks/useCurrentUser': { useCurrentUser: () => value },
    '@/components/admin/console/consoleNavigation': { initialAuthenticatedPath: () => '/home' },
    '@/components/ui/buttons/AppButton': { AppButton: 'button' },
    '@/components/shared/PageLoading': { PageLoading: 'loading' },
  });
  const blocked = route.PrivateRoute({ children: 'SECRET' });
  assert.notEqual(blocked, 'SECRET');
  assert.equal(blocked.type, 'div');
  for (const status of [401, 403]) {
    value.setSession({ userId: 7 });
    response = deferred();
    const pending = value.refreshSession();
    response.reject({ isAxiosError: true, response: { status } });
    await pending;
    value = render();
    assert.equal(value.user, null);
    assert.equal(value.status, 'unauthenticated');
  }
  h.unmount();
});

test('session: a late failure cannot replace a newer login', async () => {
  const h = hooks();
  const pending = deferred();
  const { CurrentUserProvider } = load('src/contexts/CurrentUserContext.tsx', {
    react: h.react, axios: { isAxiosError: () => true },
    '@/services/me': { getMe: () => pending.promise },
    '@/lib/queryCache': { clearQueryCache() {} },
    '@/config/features': { companySessionKey: (u) => u?.userId },
  });
  const render = () => h.render(() => CurrentUserProvider({ children: null })).props.value;
  let value = render();
  const request = value.ensureSession();
  value.setSession({ userId: 9 });
  pending.reject({ response: { status: 401 } });
  await request;
  // Avoid committing the unrelated polling effect in this isolated race test.
  value = h.render(() => CurrentUserProvider({ children: null }), false).props.value;
  assert.equal(value.status, 'authenticated');
  assert.equal(value.user.userId, 9);
});

test('module: A slow/B fast, stale failure, overlapping retries, invalid response and null ID', async () => {
  const h = hooks();
  const requests = [];
  const { useModulo } = load('src/hooks/useModulo.ts', {
    react: h.react, axios: { isAxiosError: (e) => e?.isAxiosError === true }, '@/hooks/useJornadaAtualizada': { useAoAtualizarJornada() {} }, '@/services/conteudo': { getModulo: (id) => {
      const request = deferred(); requests.push({ id, ...request }); return request.promise;
    } },
  });
  let id = 1;
  const render = () => h.render(() => useModulo(id));
  render();
  id = 2;
  assert.equal(render().modulo, null);
  requests[1].resolve({ id: 2 }); await settle();
  assert.equal(render().modulo.id, 2);
  requests[0].resolve({ id: 1 }); await settle();
  assert.equal(render().modulo.id, 2);
  let value = render();
  void value.refetch(); void value.refetch();
  requests[3].resolve({ id: 2 }); await settle();
  requests[2].reject(new Error('stale')); await settle();
  assert.equal(render().error, null);
  void render().refetch();
  requests[4].resolve({ id: 99 }); await settle();
  assert.ok(render().error);
  id = null;
  render();
  value = render();
  assert.equal(value.modulo, null);
  assert.equal(value.loading, false);
  assert.equal(value.error, null);
  id = 3; render(); h.unmount();
  requests[5].resolve({ id: 3 }); await settle();
  assert.equal(requests.length, 6);
});

test('module: 403 keeps the backend reason as denied, 404 is missing and network failure is retryable', async () => {
  const h = hooks();
  let next;
  const { useModulo } = load('src/hooks/useModulo.ts', {
    react: h.react, axios: { isAxiosError: (e) => e?.isAxiosError === true },
    '@/hooks/useJornadaAtualizada': { useAoAtualizarJornada() {} },
    '@/services/conteudo': { getModulo: () => { next = deferred(); return next.promise; } },
  });
  const render = () => h.render(() => useModulo(5));
  render();
  next.reject({ isAxiosError: true, response: { status: 403, data: { message: 'Módulo bloqueado. Conclua o módulo anterior.' } } }); await settle();
  assert.deepEqual([render().errorKind, render().error], ['denied', 'Módulo bloqueado. Conclua o módulo anterior.']);
  void render().refetch();
  next.reject({ isAxiosError: true, response: { status: 404 } }); await settle();
  assert.equal(render().errorKind, 'missing');
  void render().refetch();
  next.reject(new Error('offline')); await settle();
  assert.equal(render().errorKind, 'failed');
  void render().refetch();
  next.resolve({ id: 5 }); await settle();
  assert.equal(render().errorKind, null);
  assert.equal(render().modulo.id, 5);
  h.unmount();
});

function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  // Expande componentes sem hooks para alcançar os botões reais dos estados.
  if (typeof node.type === 'function') return nodes(node.type(node.props));
  return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
}

function loadModuleView(state, actions) {
  const AppButton = 'app-button';
  const lucide = new Proxy({}, { get: (_, name) => name === '__esModule' ? false : String(name) });
  const statePart = load('src/components/sections/HomePage/Conteudos/ModulePageState.tsx', {
    'lucide-react': lucide, '@/components/ui/buttons/AppButton': { AppButton },
  });
  const hero = load('src/components/sections/HomePage/Conteudos/ModulePageHero.tsx', {
    react: React, 'lucide-react': lucide, '@/components/ui/buttons/AppButton': { AppButton },
    '@/components/ui/visuals/Pebble': { Pebble: 'pebble' }, '@/lib/staticArtwork': { getModuleArtwork: () => '/art.png' },
    './ModulePageModel': { formatModuleNumber: String },
  });
  return load('src/components/sections/HomePage/Conteudos/ModuloDetalhes.tsx', {
    '@/components/shared/ContentLoading': { ContentLoading: 'content-loading' },
    '@/hooks/useModulo': { useModulo: () => ({ ...state(), refetch: () => actions.push('fetch') }) },
    '@/hooks/useConteudos': { useConteudos: () => ({ modulos: null }) },
    './learnMapModel': loadLearnMapModel(),
    './ModulePageModel': loadModuleModel(),
    './ModulePageHero': hero,
    './ModulePageChapters': { ModulePageChapters: 'module-chapters' },
    './ModulePageState': statePart,
    '@/styles/module-page.css': {},
  }).ModuloDetalhes;
}

function loadLearnMapModel() {
  return load('src/components/sections/HomePage/Conteudos/learnMapModel.ts', {});
}

function loadModuleModel() {
  return load('src/components/sections/HomePage/Conteudos/ModulePageModel.ts', {
    '@/lib/lessonOrder': load('src/lib/lessonOrder.ts', {}),
    './learnMapModel': loadLearnMapModel(),
  });
}

test('module view: API failure offers retry and back; 403 shows reason and only back; loading has an exit', () => {
  const actions = [];
  let current = { modulo: null, loading: false, error: 'Falha na missão', errorKind: 'failed' };
  const ModuloDetalhes = loadModuleView(() => current, actions);
  const render = () => nodes(ModuloDetalhes({ moduloId: 1, onBack: () => actions.push('back'), onSelectAula() {} }));
  const clickAll = (tree) => tree.filter((n) => n.type === 'button' || n.type === 'app-button').forEach((b) => b.props.onClick());

  let tree = render();
  assert.ok(tree.some((n) => n.props.role === 'alert' && n.props.children === 'Falha na missão'));
  clickAll(tree);
  assert.deepEqual([...actions].sort(), ['back', 'back', 'fetch']);

  actions.length = 0;
  current = { modulo: null, loading: false, error: 'Módulo bloqueado. Conclua o módulo anterior para liberá-lo.', errorKind: 'denied' };
  tree = render();
  assert.ok(tree.some((n) => n.props.role === 'alert' && /Conclua o módulo anterior/.test(n.props.children)));
  clickAll(tree);
  assert.ok(!actions.includes('fetch'), 'acesso negado não oferece tentar de novo');
  assert.ok(actions.length > 0 && actions.every((a) => a === 'back'));

  actions.length = 0;
  current = { modulo: null, loading: true, error: null, errorKind: null };
  tree = render();
  assert.ok(tree.some((n) => n.type === 'content-loading' && n.props.variant === 'module'));
  const exits = tree.filter((n) => n.type === 'button' || n.type === 'app-button');
  assert.equal(exits.length, 1);
  exits[0].props.onClick();
  assert.deepEqual(actions, ['back']);
});

test('module view: module without lessons shows an empty state with a way back', () => {
  const actions = [];
  const modulo = { id: 1, title: 'Vazio', description: '', difficulty: 'iniciante', category: 'X', order: 1, xp_total: 0, xp_bonus: 0, aulas: [] };
  const ModuloDetalhes = loadModuleView(() => ({ modulo, loading: false, error: null, errorKind: null }), actions);
  const tree = nodes(ModuloDetalhes({ moduloId: 1, onBack: () => actions.push('back'), onSelectAula: () => actions.push('aula') }));
  assert.ok(tree.some((n) => n.props.role === 'status'));
  assert.ok(!tree.some((n) => n.type === 'module-chapters'));
  assert.ok(!tree.some((n) => n.type === 'app-button' && /aula/.test(String(n.props.children))));
});

test('module model: chapters follow lesson order, next lesson comes from backend status, locked stays locked', () => {
  const { buildModulePage } = loadModuleModel();
  const aula = (id, order, section, status, extra = {}) => ({ id, order, section_name: section, status, type: 'video', duration: 0, xp: 30, progress_percent: 0, title: `A${id}`, ...extra });
  const page = buildModulePage({
    id: 1, title: 'M', difficulty: 'intermediario', category: 'C', order: 2, xp_total: 300, xp_bonus: 50,
    aulas: [aula(3, 3, 'Dois', 'locked'), aula(1, 1, 'Um', 'completed'), aula(2, 2, 'Um', 'unlocked', { type: 'quadrinho', progress_percent: 40 })],
  });
  assert.deepEqual(JSON.parse(JSON.stringify(page.chapters.map((c) => [c.title, c.lessons.map((l) => l.number), c.state]))), [['Um', [1, 2], 'current'], ['Dois', [3], 'locked']]);
  assert.equal(page.next.aula.id, 2);
  assert.equal(page.started, true);
  assert.equal(page.completed, 1);
  assert.equal(page.territory, 'Vale dos Guardiões');
  assert.equal(page.levelLabel, 'Nível Médio');
  assert.equal(page.typesLabel, 'vídeo e quadrinho');
  const none = buildModulePage({ id: 1, title: 'M', difficulty: 'iniciante', category: 'C', order: 1, xp_total: 0, xp_bonus: 0, aulas: [aula(9, 1, null, 'locked')] });
  assert.equal(none.next, null, 'o cliente não libera aula que o backend bloqueou');
  assert.equal(none.chapters[0].title, 'Aulas do módulo');
});

test('module chapters: the tab that opens first is the chapter of the next lesson', () => {
  const { buildModulePage, initialChapterIndex } = loadModuleModel();
  const aula = (id, section, status) => ({ id, order: id, section_name: section, status, type: 'texto', duration: 0, xp: 10, progress_percent: 0, title: `A${id}` });
  const base = { id: 1, title: 'M', difficulty: 'iniciante', category: 'C', order: 1, xp_total: 0, xp_bonus: 0 };
  const midway = buildModulePage({ ...base, aulas: [aula(1, 'Um', 'completed'), aula(2, 'Dois', 'completed'), aula(3, 'Tres', 'unlocked'), aula(4, 'Quatro', 'locked')] });
  assert.equal(initialChapterIndex(midway), 2);
  const finished = buildModulePage({ ...base, aulas: [aula(1, 'Um', 'completed'), aula(2, 'Dois', 'completed')] });
  assert.equal(initialChapterIndex(finished), 0, 'sem próxima aula, abre o primeiro capítulo');
  const allLocked = buildModulePage({ ...base, aulas: [aula(1, 'Um', 'locked')] });
  assert.equal(initialChapterIndex(allLocked), 0);
});

test('module number: same API position on the map and on the module page, never the raw order field', () => {
  const { buildLearnJourney, moduleNumberOf } = loadLearnMapModel();
  const mod = (id, difficulty, order) => ({ id, difficulty, order, progress: 0, totalAulas: 1, completedAulas: 0, hasStarted: false, locked: false });
  // API intercala dificuldades e usa `order` não sequencial.
  const modulos = [mod(7, 'intermediario', 40), mod(3, 'iniciante', 10), mod(9, 'iniciante', 90)];
  const journey = buildLearnJourney(modulos, null);
  const byId = Object.fromEntries(journey.modules.map((item) => [item.modulo.id, item.number]));
  assert.deepEqual(byId, { 7: 1, 3: 2, 9: 3 });
  assert.equal(moduleNumberOf(modulos, 9), 3);
  assert.equal(moduleNumberOf(modulos, 99), null);
  assert.equal(moduleNumberOf(null, 9), null);
});
