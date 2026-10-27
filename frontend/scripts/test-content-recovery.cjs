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
    react: h.react, '@/services/conteudo': { getModulo: (id) => {
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

test('book frame: error, retry success, timeout and cleanup', () => {
  const h = hooks();
  const images = [];
  const timers = new Map();
  let next = 0;
  const { useModuleBookFrame } = load('src/hooks/useModuleBookFrame.ts', { react: h.react }, {
    Image: class { constructor() { images.push(this); } },
    window: { setTimeout(fn) { timers.set(++next, fn); return next; }, clearTimeout(id) { timers.delete(id); } },
  });
  let src = '/frame.png';
  const render = () => h.render(() => useModuleBookFrame(src));
  assert.equal(render().status, 'loading');
  images[0].onerror();
  assert.equal(render().status, 'error');
  render().retry();
  assert.equal(render().status, 'loading');
  images[1].onload();
  assert.equal(render().status, 'ready');
  src = '/other.png'; render();
  [...timers.values()][0]();
  assert.equal(render().status, 'error');
  render().retry(); render(); h.unmount();
  assert.equal(timers.size, 0);
  assert.equal(images.at(-1).onload, null);
  src = undefined;
  assert.equal(render().status, 'error');
});

test('module view: API/frame failure offers retry and back; loading has an exit', () => {
  const actions = [];
  let error = 'Falha na missão';
  let loading = false;
  let frame = 'ready';
  const { ModuloDetalhes } = load('src/components/sections/HomePage/Conteudos/ModuloDetalhes.tsx', {
    '@/components/shared/ContentLoading': { ContentLoading: 'content-loading' },
    react: { ...React, useState: () => [0], useEffect() {} },
    '@/hooks/useModulo': { useModulo: () => ({ modulo: null, loading, error, refetch: () => actions.push('fetch') }) },
    '@/hooks/useModuleBookFrame': { useModuleBookFrame: () => ({ status: frame, retry: () => actions.push('frame') }) },
    './AulaListItem': {}, '@/services/conteudo': {}, 'lucide-react': {},
    '@/components/ui/buttons/AppButton': { AppButton: 'button' },
    '@/hooks/useMissionRoomAssets': { useMissionRoomAssets: () => ({}) },
    '@/components/ui/visuals/ProgressiveImage': {}, '@/lib/staticArtwork': {},
    '@/lib/lessonOrder': {}, '@/styles/module-library-room.css': {},
    '@/hooks/useNotebookLayout': { useNotebookLayout: () => false },
    '@/components/ui/navigation/PageControls': {},
  });
  function nodes(node) {
    if (!node || typeof node !== 'object') return [];
    return [node, ...React.Children.toArray(node.props?.children).flatMap(nodes)];
  }
  const render = () => nodes(ModuloDetalhes({ moduloId: 1, onBack: () => actions.push('back'), onSelectAula() {} }));
  for (const kind of ['api', 'frame']) {
    error = kind === 'api' ? 'Falha na missão' : null;
    frame = kind === 'frame' ? 'error' : 'ready';
    const tree = render();
    assert.ok(tree.some((n) => n.props.role === 'alert'));
    const buttons = tree.filter((n) => n.type === 'button');
    buttons.forEach((button) => button.props.onClick());
  }
  assert.deepEqual(actions, ['fetch', 'frame', 'back', 'fetch', 'frame', 'back']);
  error = null; loading = true; frame = 'loading';
  assert.ok(render().some((n) => n.type === 'content-loading' && n.props.variant === 'book'));
  assert.equal(render().filter((n) => n.type === 'button').length, 1);
});
