const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const { test } = require('node:test');

function load(file, dependencies = {}, globals = {}) {
  const source = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, Date, Map, Set,
    require(name) {
      if (!(name in dependencies)) throw new Error(`Unexpected dependency: ${name}`);
      return dependencies[name];
    },
    ...globals,
  });
  return module.exports;
}

test('completed progress refreshes scoped XP, streak, achievements and all ranking variants', () => {
  const cache = load('src/lib/queryCache.ts');
  const { invalidateProgress } = load('src/lib/progressCache.ts', { './queryCache': cache });
  const keys = [
    'dashboardStats', 'weeklyStreak', 'dashboardDaily', 'dashboardJourney',
    'conteudoModulos', 'achievementRecent', 'achievementTrail', 'achievementShop',
    'dashboardRanking:company:self:current:none', 'dashboardRanking:global:self:total:none',
    'challenge-status:42',
  ].map((key) => `${key}::company-session=user-1`);
  let notified = 0;
  for (const key of keys) {
    cache.setCache(key, { old: true });
    cache.subscribe(key, () => notified++);
  }
  cache.setCache('unrelated', 'keep');
  invalidateProgress();
  for (const key of keys) assert.equal(cache.getCached(key), null, key);
  assert.equal(notified, keys.length);
  assert.equal(cache.getCached('unrelated'), 'keep');
});

test('an older in-flight response cannot overwrite data fetched after progress', async () => {
  const cache = load('src/lib/queryCache.ts');
  let finishOld;
  const old = cache.fetchCached('weeklyStreak', () => new Promise((resolve) => { finishOld = resolve; }));
  cache.invalidate('weeklyStreak');
  await cache.fetchCached('weeklyStreak', async () => 'checked-today');
  finishOld('not-checked');
  await old;
  assert.equal(cache.getCached('weeklyStreak'), 'checked-today');
});

function eventTarget() {
  const listeners = new Map();
  return {
    addEventListener(name, callback) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(callback);
    },
    removeEventListener(name, callback) { listeners.get(name)?.delete(callback); },
    emit(name, ...args) { for (const callback of listeners.get(name) ?? []) callback(...args); },
  };
}

test('password renewal reconnects the current socket after HTTP success, without credentials in the event', async () => {
  const effects = [];
  const calls = [];
  const events = [];
  const window = {
    ...eventTarget(),
    dispatchEvent(event) { events.push(event); this.emit(event.type); },
  };
  const session = load('src/services/session-events.ts', {}, { window, Event });
  const socket = {
    disconnect() { calls.push('disconnect'); },
    connect() { calls.push('connect'); },
  };
  const { useSocket } = load('src/hooks/useSocket.ts', {
    react: { useState: () => [null, () => {}], useEffect: (effect) => effects.push(effect) },
    'socket.io-client': { io: () => socket },
    '@/services/api-config': { SOCKET_ORIGIN: '/fixture', SOCKET_PATH: '/socket.io' },
    '@/services/session-events': session,
  }, { window });
  let finish;
  const api = { patch: () => new Promise((resolve) => { finish = resolve; }) };
  const { changePassword } = load('src/services/profile.ts', {
    '@/services/api': { api }, './session-events': session,
  });
  useSocket(7);
  const cleanup = effects[0]();
  const pending = changePassword({ currentPassword: 'fixture-old', newPassword: 'fixture-new' });
  assert.deepEqual(calls, []);
  finish({ data: { message: 'ok' } });
  await pending;
  assert.deepEqual(calls, ['disconnect', 'connect']);
  assert.equal(events[0].detail, undefined);
  api.patch = async () => { throw new Error('fixture rejected'); };
  await assert.rejects(changePassword({ currentPassword: 'wrong', newPassword: 'fixture-new' }));
  assert.deepEqual(calls, ['disconnect', 'connect']);
  cleanup();
  session.notifySessionRenewed();
  assert.deepEqual(calls, ['disconnect', 'connect', 'disconnect']);
});

test('visible polling, focus and reconnect refresh without clearing displayed data; cleanup stops work', async () => {
  let now = 100_000;
  const cache = load('src/lib/queryCache.ts', {}, { Date: class extends Date { static now() { return now; } } });
  const effects = [];
  const writes = [];
  const timers = new Map();
  const window = {
    ...eventTarget(),
    setInterval(callback, delay) { timers.set(delay, callback); return delay; },
    clearInterval(id) { timers.delete(id); },
  };
  const document = { ...eventTarget(), visibilityState: 'visible' };
  const navigator = { onLine: true };
  const react = {
    useState(initial) { return [initial, (value) => writes.push(value)]; },
    useRef(current) { return { current }; },
    useCallback(callback) { return callback; },
    useEffect(callback) { effects.push(callback); },
  };
  const { useCachedQuery } = load('src/hooks/useCachedQuery.ts', {
    react,
    '@/lib/queryCache': cache,
    './useCurrentUser': { useCurrentUser: () => ({ user: { userId: 1 } }) },
    '@/config/features': { companyCacheKey: (key) => `${key}::company-session=1` },
  }, { window, document, navigator });
  const key = 'dashboardStats::company-session=1';
  cache.setCache(key, { xp: 1 });
  let requests = 0;
  useCachedQuery('dashboardStats', async () => ({ xp: ++requests }), { refetchInterval: 60_000 });
  const cleanup = effects.map((effect) => effect());
  const settle = () => new Promise((resolve) => setImmediate(resolve));
  assert.equal(requests, 0);
  document.visibilityState = 'hidden';
  timers.get(60_000)();
  assert.equal(requests, 0);
  document.visibilityState = 'visible';
  timers.get(60_000)();
  await settle();
  assert.equal(requests, 1);
  now += 10_001;
  window.emit('focus');
  await settle();
  assert.equal(requests, 2);
  navigator.onLine = false;
  timers.get(60_000)();
  assert.equal(requests, 2);
  navigator.onLine = true;
  window.emit('online');
  await settle();
  assert.equal(requests, 3);
  const before = writes.length;
  cache.invalidate('dashboardStats');
  assert.equal(writes.slice(before).some((value) => value?.value === null), false);
  await settle();
  assert.equal(requests, 4);
  for (const dispose of cleanup.reverse()) dispose?.();
  assert.equal(timers.size, 0);
  window.emit('online');
  await settle();
  assert.equal(requests, 4);
});

test('notifications recover on connect and a late HTTP snapshot cannot erase a socket event', async () => {
  const effects = [];
  const state = [];
  const timers = new Map();
  const window = {
    ...eventTarget(),
    setInterval(callback, delay) { timers.set(delay, callback); return delay; },
    clearInterval(id) { timers.delete(id); },
  };
  const events = eventTarget();
  const socket = { on: events.addEventListener, off: events.removeEventListener };
  let resolveFirst;
  let calls = 0;
  const item = { id: 7, title: 'Nova conquista', readed: false };
  const { useNotification } = load('src/hooks/useNotification.ts', {
    react: {
      useState(initial) {
        const index = state.length;
        state.push(initial);
        return [initial, (value) => { state[index] = typeof value === 'function' ? value(state[index]) : value; }];
      },
      useRef(current) { return { current }; },
      useCallback(callback) { return callback; },
      useEffect(callback) { effects.push(callback); },
    },
    '@/hooks/useSocket': { useSocket: () => socket },
    '@/hooks/useCurrentUser': { useCurrentUser: () => ({ user: { userId: 1 }, loading: false }) },
    '@/services/notification': {
      getNotification: () => {
        calls++;
        return calls === 1 ? new Promise((resolve) => { resolveFirst = resolve; }) : Promise.resolve([item]);
      },
      markNotificationAsRead: async () => {},
      markAllNotificationsAsRead: async () => {},
    },
  }, { window, document: { ...eventTarget(), visibilityState: 'visible' }, navigator: { onLine: true } });
  useNotification();
  const cleanup = effects.map((effect) => effect());
  events.emit('new-notification', item);
  events.emit('new-notification', item);
  assert.equal(state[0].length, 1);
  resolveFirst([]);
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.equal(state[0].length, 1);
  events.emit('connect');
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 3);
  assert.equal(state[0].length, 1);
  assert.equal(state[0][0].id, 7);
  for (const dispose of cleanup) dispose?.();
  assert.equal(timers.size, 0);
});
