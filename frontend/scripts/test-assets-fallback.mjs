import assert from 'node:assert/strict';
import { test } from 'node:test';
import { onRequest } from '../functions/assets/[[path]].js';

const serve = (response) => onRequest({ next: async () => response });
const html = '<!DOCTYPE html><html></html>';

test('assets: real files keep the long cache, missing files never become cached HTML', async (t) => {
  await t.test('an existing script is served unchanged with the one-year cache', async () => {
    const result = await serve(new Response('export {}', {
      headers: { 'Content-Type': 'application/javascript' },
    }));
    assert.equal(result.status, 200);
    assert.equal(result.headers.get('Content-Type'), 'application/javascript');
    assert.equal(result.headers.get('Cache-Control'), 'public, max-age=31536000, immutable');
    assert.equal(result.headers.get('X-Content-Type-Options'), 'nosniff');
    assert.equal(await result.text(), 'export {}');
  });

  await t.test('the index.html fallback for a missing file becomes an uncached 404', async () => {
    const result = await serve(new Response(html, {
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    }));
    assert.equal(result.status, 404);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.doesNotMatch(await result.text(), /<html/i);
  });

  await t.test('a plain 404 from the asset server is not cached either', async () => {
    const result = await serve(new Response('missing', { status: 404 }));
    assert.equal(result.status, 404);
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
  });

  await t.test('a 304 revalidation keeps its status and does not gain a new cache policy', async () => {
    const result = await serve(new Response(null, { status: 304 }));
    assert.equal(result.status, 304);
    assert.equal(result.headers.get('Cache-Control'), null);
  });
});
