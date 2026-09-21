import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/api/[[path]].js';

const site = 'https://secureplay.pages.dev';
const env = { API_ORIGIN: 'https://secureplay-api.onrender.com' };
const request = (path, init) => new Request(`${site}/api${path}`, init);

test('proxy: cookies, writes, errors, redirects, origin and WebSocket handshake', async (t) => {
  const originalFetch = globalThis.fetch;
  try {
    await t.test('login preserves body, origin and multiple Set-Cookie headers; disables caching', async () => {
      globalThis.fetch = async (outgoing, options) => {
        assert.equal(outgoing.url, `${env.API_ORIGIN}/auth/login`);
        assert.equal(outgoing.method, 'POST');
        assert.equal(outgoing.headers.get('Origin'), site);
        assert.equal(outgoing.headers.get('X-Requested-With'), 'SecurePlay');
        assert.deepEqual(await outgoing.json(), { email: 'test@example.com', password: 'test-only' });
        assert.equal(outgoing.redirect, 'manual');
        assert.equal(options.cf.cacheTtl, 0);
        const headers = new Headers();
        headers.append('Set-Cookie', 'token=test-only; Path=/; HttpOnly; Secure; SameSite=Lax');
        headers.append('Set-Cookie', 'other=test-only; Path=/; Secure');
        return new Response('{"message":"ok"}', { headers });
      };
      const result = await onRequest({ env, request: request('/auth/login', {
        method: 'POST', headers: { Origin: site, 'Content-Type': 'application/json', 'X-Requested-With': 'SecurePlay' },
        body: JSON.stringify({ email: 'test@example.com', password: 'test-only' }),
      }) });
      assert.equal(result.status, 200);
      assert.equal(result.headers.getSetCookie().length, 2);
      assert.match(result.headers.getSetCookie()[0], /HttpOnly; Secure; SameSite=Lax/);
      assert.equal(result.headers.get('Cache-Control'), 'private, no-store');
    });
    await t.test('authenticated requests forward cookies and query strings', async () => {
      globalThis.fetch = async (outgoing) => {
        assert.equal(outgoing.url, `${env.API_ORIGIN}/auth/me?check=1`);
        assert.equal(outgoing.headers.get('Cookie'), 'token=test-only');
        return Response.json({ userId: 1 });
      };
      const result = await onRequest({ env, request: request('/auth/me?check=1', { headers: { Cookie: 'token=test-only' } }) });
      assert.deepEqual(await result.json(), { userId: 1 });
    });
    await t.test('401 and logout cookie deletion survive forwarding', async () => {
      globalThis.fetch = async () => new Response('unauthorized', { status: 401 });
      assert.equal((await onRequest({ env, request: request('/auth/me') })).status, 401);
      globalThis.fetch = async () => new Response(null, {
        status: 204, headers: { 'Set-Cookie': 'token=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Lax' },
      });
      const result = await onRequest({ env, request: request('/auth/logout', { method: 'POST', headers: { Origin: site } }) });
      assert.equal(result.status, 204);
      assert.match(result.headers.get('Set-Cookie'), /Max-Age=0/);
    });
    await t.test('untrusted origins and writes without Origin never reach backend', async () => {
      globalThis.fetch = async () => { throw new Error('Must not fetch'); };
      for (const headers of [{ Origin: 'https://attacker.example' }, {}]) {
        assert.equal((await onRequest({ env, request: request('/auth/login', { method: 'POST', headers }) })).status, 403);
      }
      assert.equal((await onRequest({ env, request: request('/socket.io/', {
        headers: { 'Sec-Fetch-Site': 'cross-site' },
      }) })).status, 403);
    });
    await t.test('invalid upstream settings fail closed', async () => {
      for (const origin of [undefined, 'http://example.com', 'https://example.com/path', 'https://user:pass@example.com', site]) {
        assert.equal((await onRequest({ env: { API_ORIGIN: origin }, request: request('/health') })).status, 503);
      }
    });
    await t.test('a path cannot override the configured destination', async () => {
      globalThis.fetch = async (outgoing) => {
        assert.equal(new URL(outgoing.url).origin, env.API_ORIGIN);
        return new Response('ok');
      };
      assert.equal((await onRequest({ env, request: request('//attacker.example/path') })).status, 200);
    });
    await t.test('redirects are not followed and network failures return a generic 502', async () => {
      globalThis.fetch = async () => new Response(null, { status: 302, headers: { Location: 'https://elsewhere.example' } });
      assert.equal((await onRequest({ env, request: request('/health') })).status, 502);
      globalThis.fetch = async () => { throw new Error('private connection details'); };
      const result = await onRequest({ env, request: request('/health') });
      assert.equal(result.status, 502);
      assert.doesNotMatch(await result.text(), /private connection details/);
    });
    await t.test('Socket.IO polling uses the backend transport path', async () => {
      globalThis.fetch = async (outgoing) => {
        assert.equal(outgoing.url, `${env.API_ORIGIN}/socket.io/?EIO=4&transport=polling`);
        assert.equal(outgoing.headers.get('Origin'), site);
        return new Response('0{"sid":"test"}');
      };
      assert.equal((await onRequest({ env, request: request('/socket.io/?EIO=4&transport=polling') })).status, 200);
    });
    await t.test('WebSocket 101 response is passed through unchanged', async () => {
      // Node's Response does not implement Workers' 101/WebSocket extension.
      const upgrade = { status: 101, webSocket: {} };
      globalThis.fetch = async (outgoing) => {
        assert.equal(new URL(outgoing.url).pathname, '/socket.io/');
        assert.equal(outgoing.headers.get('Upgrade'), 'websocket');
        assert.equal(outgoing.headers.get('Cookie'), 'token=test-only');
        return upgrade;
      };
      const result = await onRequest({ env, request: request('/socket.io/?EIO=4&transport=websocket', {
        headers: { Origin: site, Upgrade: 'websocket', Cookie: 'token=test-only' },
      }) });
      assert.equal(result, upgrade);
    });
  } finally {
    globalThis.fetch = originalFetch;
  }
});
