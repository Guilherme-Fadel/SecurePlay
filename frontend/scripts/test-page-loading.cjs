const assert = require('node:assert/strict');
const { test } = require('node:test');
const { load } = require('./helpers/react-hooks.cjs');

function coordinator() {
  let state;
  const { PageLoadingProvider } = load('src/contexts/PageLoadingContext.tsx', {
    react: {
      createContext: () => ({ Provider: 'context' }), useCallback: (fn) => fn,
      useReducer: (reduce, initial) => {
        state ??= initial;
        return [state, (action) => { state = reduce(state, action); }];
      },
    },
    '@/components/shared/LoadingScreen': { LoadingScreen: 'loading-screen' },
  });
  const render = () => PageLoadingProvider({ children: 'page' });
  return { set: (id, active) => render().props.value(id, active), screen: () => render().props.children[1] };
}

test('session, lazy route and Home bootstrap share one loading cycle without restarting', () => {
  const loading = coordinator();
  assert.equal(loading.screen(), false);
  loading.set('session', true);
  const first = loading.screen();
  loading.set('session', false);
  loading.set('route', true);
  assert.equal(loading.screen().key, first.key);
  loading.set('route', false);
  loading.set('home', true);
  assert.equal(loading.screen().key, first.key);
  assert.equal(loading.screen().props.ready, false);
  loading.set('home', false);
  assert.equal(loading.screen().props.ready, true);
  loading.screen().props.onHidden();
  assert.equal(loading.screen(), false);
  loading.set('another-navigation', true);
  assert.notEqual(loading.screen().key, first.key);
});

test('an exiting loader cannot hide a new pending navigation or a second active source', () => {
  const loading = coordinator();
  loading.set('route', true);
  loading.set('home', true);
  loading.set('route', false);
  assert.equal(loading.screen().props.ready, false);
  loading.set('home', false);
  const exiting = loading.screen();
  loading.set('next', true);
  exiting.props.onHidden();
  assert.equal(loading.screen().key, exiting.key);
  assert.equal(loading.screen().props.ready, false);
  loading.set('next', false);
  loading.screen().props.onHidden();
  assert.equal(loading.screen(), false);
});
