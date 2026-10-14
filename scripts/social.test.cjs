// Local failure-path tests; no production credentials, requests, or mutations.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const path = require('node:path');
const source = ts.transpileModule(fs.readFileSync(path.join(__dirname, '../src/backend/social.ts'), 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;

function setup({ responses = [], uploadError = null, bytes = new ArrayBuffer(8), signed = [], mime = 'video/mp4' } = {}) {
  const calls = [];
  const storage = {
    upload: async (...args) => { calls.push(['upload', ...args]); return { error: uploadError }; },
    remove: async paths => { calls.push(['remove', paths]); return { error: null }; },
    createSignedUrls: async () => ({ data: signed, error: null }),
  };
  const client = {
    storage: { from: () => storage },
    from(table) {
      const response = responses.shift();
      if (!response) throw new Error(`Unexpected query to ${table}`);
      calls.push(['from', table]);
      const query = { then: (resolve, reject) => Promise.resolve(response).then(resolve, reject) };
      for (const method of ['select','insert','delete','eq','in','match','order','range','single','maybeSingle']) {
        query[method] = (...args) => { calls.push([method, ...args]); return query; };
      }
      return query;
    },
  };
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => {
    if (name === '../auth') return { supabase: client };
    if (name === './media') return { readMedia: async () => ({ bytes, type: mime }) };
    throw new Error(`Unexpected import ${name}`);
  } });
  return { api: exports, calls };
}
const draft = { id: 'local', title: 'Test', description: '', city: 'Delhi', category: 'Tech', mediaType: 'video', mediaUri: 'blob:test', creator: 'Test', handle: '@you', emoji: '', action: 'Save' };
test('save errors propagate instead of reporting success', async () => {
  const { api } = setup({ responses: [{ error: { code: '42501', message: 'denied' } }] });
  await assert.rejects(api.setSaved('a', 'post', true), /denied/);
});
test('duplicate save is idempotent', async () => {
  const { api } = setup({ responses: [{ error: { code: '23505', message: 'duplicate' } }] });
  await api.setSaved('a', 'post', true);
});
test('unsave is scoped to both account and post', async () => {
  const { api, calls } = setup({ responses: [{ error: null }] });
  await api.setSaved('a', 'post', false);
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'user_id' && call[2] === 'a'));
  assert.ok(calls.some(call => call[0] === 'eq' && call[1] === 'post_id' && call[2] === 'post'));
});
test('invalid media is rejected before upload', async () => {
  const { api, calls } = setup({ mime: 'text/html' });
  await assert.rejects(api.publishPost('a', draft), /Use JPG/);
  assert.equal(calls.length, 0);
});
test('oversize media is rejected before upload', async () => {
  const { api, calls } = setup({ bytes: new ArrayBuffer(26214401) });
  await assert.rejects(api.publishPost('a', draft), /25 MB/);
  assert.equal(calls.length, 0);
});
test('failed post insert removes only its newly uploaded file after confirmed absence', async () => {
  const { api, calls } = setup({ responses: [{ error: { message: 'insert failed' } }, { data: null, error: null }] });
  await assert.rejects(api.publishPost('a', draft), /confirm publication/);
  const uploaded = calls.find(call => call[0] === 'upload')[1];
  assert.equal(calls.find(call => call[0] === 'remove')[1][0], uploaded);
});
test('ambiguous network result never deletes media of a committed post', async () => {
  const { api, calls } = setup({ responses: [{ error: { message: 'timeout' } }, { data: { id: 'committed' }, error: null }] });
  assert.equal((await api.publishPost('a', draft)).id, 'committed');
  assert.equal(calls.some(call => call[0] === 'remove'), false);
});
test('unresolved network result preserves media for recovery', async () => {
  const { api, calls } = setup({ responses: [{ error: { message: 'timeout' } }, { data: null, error: { message: 'offline' } }] });
  await assert.rejects(api.publishPost('a', draft), /confirm publication/);
  assert.equal(calls.some(call => call[0] === 'remove'), false);
});
