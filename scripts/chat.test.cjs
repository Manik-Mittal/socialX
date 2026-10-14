// No credentials or network: exercise the real backend adapter with scripted responses.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/backend/chat.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
const me = '11111111-1111-4111-8111-111111111111';
const peer = '22222222-2222-4222-8222-222222222222';
function setup(responses = []) {
  const calls = [];
  const client = { from(table) {
    calls.push(['from', table]);
    assert.ok(responses.length, 'Unexpected database query');
    const response = responses.shift();
    const query = { then: (resolve, reject) => Promise.resolve(response).then(resolve, reject) };
    for (const method of ['select', 'insert', 'eq', 'neq', 'ilike', 'order', 'limit', 'or', 'lt', 'gt', 'single', 'maybeSingle']) query[method] = (...args) => { calls.push([method, ...args]); return query; };
    return query;
  } };
  const exports = {};
  vm.runInNewContext(source, { exports, require: () => ({ client: () => client, hydrate: async rows => rows }) });
  return { api: exports, calls };
}
test('empty messages and self messages never write', async () => {
  const { api, calls } = setup();
  await assert.rejects(api.sendMessage(me, peer, '  ', undefined, 'nonce'), /Write/);
  await assert.rejects(api.sendMessage(me, me, 'Hello', undefined, 'nonce'), /another/);
  assert.equal(calls.length, 0);
});
test('ambiguous send recovers the same committed message by sender and nonce', async () => {
  const message = { id: 12, body: 'Hello' };
  const { api, calls } = setup([{ error: { message: 'timeout' } }, { data: message }]);
  assert.equal((await api.sendMessage(me, peer, 'Hello', undefined, 'same-nonce')).id, 12);
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'sender_id' && c[2] === me));
  assert.ok(calls.some(c => c[0] === 'eq' && c[1] === 'client_nonce' && c[2] === 'same-nonce'));
});
test('failed send stays failed if no committed row can be found', async () => {
  const { api } = setup([{ error: { message: 'denied' } }, { data: null }]);
  await assert.rejects(api.sendMessage(me, peer, 'Hello', undefined, 'same-nonce'), { message: 'denied' });
});
test('reel share stores a post reference and optional text', async () => {
  const { api, calls } = setup([{ data: { id: 3 }, error: null }]);
  await api.sendMessage(me, peer, ' Watch this ', me, 'reel-nonce');
  const payload = calls.find(c => c[0] === 'insert')[1];
  assert.equal(payload.post_id, me); assert.equal(payload.body, 'Watch this'); assert.equal(payload.kind, 'reel');
});
test('history is scoped to both participants and a stable cursor', async () => {
  const { api, calls } = setup([{ data: [] }]);
  await api.messagePage(me, peer, 40);
  assert.ok(calls.some(c => c[0] === 'or' && c[1].includes(`sender_id.eq.${me},recipient_id.eq.${peer}`) && c[1].includes(`sender_id.eq.${peer},recipient_id.eq.${me}`)));
  assert.ok(calls.some(c => c[0] === 'lt' && c[1] === 'id' && c[2] === 40));
});
test('invalid conversation identifiers cannot be injected into filters', async () => {
  const { api, calls } = setup();
  await assert.rejects(api.messagePage(me, 'x),sender_id.neq.x'), /Invalid/);
  assert.equal(calls.length, 0);
});
test('deleted shared posts have a clear unavailable result', async () => {
  const { api } = setup([{ data: null }]);
  await assert.rejects(api.getSharedPost(me, peer), /no longer available/);
});
