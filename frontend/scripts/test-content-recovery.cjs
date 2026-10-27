const assert = require('node:assert/strict');
const React = require('react');
const { test } = require('node:test');
const { load, hooks, settle, deferred } = require('./helpers/react-hooks.cjs');

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
