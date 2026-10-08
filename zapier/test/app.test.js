'use strict';

const assert = require('node:assert/strict');
const { test, beforeEach, afterEach } = require('node:test');
const nock = require('nock');
const zapier = require('zapier-platform-core');

const App = require('../index');
const { API_BASE } = require('../lib/constants');

const appTester = zapier.createAppTester(App);
zapier.tools.env.inject();

const KEY = 'st_live_' + 'k'.repeat(43);
const authData = { apiKey: KEY };
const JOB = '3f1c2a9e-5b7d-4e2a-9c1b-0d8e7f6a5b4c';

beforeEach(() => nock.disableNetConnect());
afterEach(() => {
  nock.cleanAll();
  nock.enableNetConnect();
});

test('auth test calls /me with the key and the client header', async () => {
  const api = nock(API_BASE, {
    reqheaders: { authorization: `Bearer ${KEY}`, 'x-scribetools-client': /^zapier\// },
  })
    .get('/api/v1/me')
    .reply(200, { email: 'owner@example.com', plan: 'Pro' });

  const result = await appTester(App.authentication.test, { authData });

  assert.equal(result.email, 'owner@example.com');
  assert.ok(api.isDone());
});

test('a bad key is an authentication error with the API message', async () => {
  nock(API_BASE).get('/api/v1/me').reply(401, { detail: { code: 'invalid_api_key', message: 'API key is invalid or revoked.' } });

  await assert.rejects(appTester(App.authentication.test, { authData }), (err) => {
    assert.match(err.message, /API key is invalid or revoked/);
    return true;
  });
});

test('process document sends the file URL, options and a callback URL', async () => {
  let sent;
  nock(API_BASE)
    .post('/api/v1/outcome-jobs', (body) => {
      sent = body;
      return true;
    })
    .reply(201, { job_id: JOB, created: true, state: 'queued', outcome: 'translation', format: 'docx', credits_reserved: 4 });

  const result = await appTester(App.creates.process_document.operation.perform, {
    authData,
    inputData: {
      file: 'https://files.example.com/book.pdf',
      outcome: 'translation',
      language: 'urd',
      target_language: 'eng',
      job_name: 'Book',
    },
  });

  assert.equal(result.job_id, JOB);
  assert.deepEqual(sent.sources, [{ url: 'https://files.example.com/book.pdf' }]);
  assert.deepEqual(sent.options, { language: 'urd', target_language: 'eng' });
  assert.equal(sent.name, 'Book');
  assert.match(sent.callback_url, /^http/);
  assert.match(sent.idempotency_key, /^[0-9a-f-]{36}$/);
});

test('resume returns results with inline text and a file', async () => {
  nock(API_BASE)
    .get(`/api/v1/outcome-jobs/${JOB}`)
    .reply(200, { job_id: JOB, state: 'completed', outcome: 'extract_text', format: 'txt', credits_charged: 2, errors: [] })
    .get(`/api/v1/outcome-jobs/${JOB}/results`)
    .reply(200, {
      job_id: JOB,
      state: 'completed',
      terminal: true,
      pending_items: 0,
      results: [{ result_id: 'r1', item_id: 1, format: 'txt', filename: 'book.txt', kind: 'file', media_type: 'text/plain' }],
    })
    .get(`/api/v1/outcome-jobs/${JOB}/results/r1/content`)
    .reply(200, { result_id: 'r1', format: 'txt', text: 'نص عربي', data: null, size_bytes: 13 });

  const result = await appTester(App.creates.process_document.operation.performResume, {
    authData,
    outputData: { job_id: JOB },
    cleanedRequest: { event: 'outcome_job.finished', job_id: JOB, state: 'completed' },
  });

  assert.equal(result.state, 'completed');
  assert.equal(result.text, 'نص عربي');
  assert.equal(result.filename, 'book.txt');
  assert.match(String(result.file), /hydrate/);
});

test('resume of a failed job errors with the reason', async () => {
  nock(API_BASE)
    .get(`/api/v1/outcome-jobs/${JOB}`)
    .reply(200, { job_id: JOB, state: 'failed', errors: [{ item_id: 1, message: 'Unreadable PDF' }] });

  await assert.rejects(
    appTester(App.creates.process_document.operation.performResume, { authData, outputData: { job_id: JOB }, cleanedRequest: { job_id: JOB } }),
    /failed: Unreadable PDF/,
  );
});

test('extract custom data builds a schema and flattens the fields', async () => {
  let sent;
  nock(API_BASE)
    .post('/api/v1/outcome-jobs', (body) => {
      sent = body;
      return true;
    })
    .reply(201, { job_id: JOB, created: true, state: 'queued' });

  await appTester(App.creates.extract_custom_data.operation.perform, {
    authData,
    inputData: { file: 'https://files.example.com/inv.pdf', fields: [{ name: 'Invoice Number' }, { name: 'Total', type: 'number' }] },
  });
  assert.equal(sent.outcome, 'custom_data_extraction');
  assert.deepEqual(Object.keys(sent.options.output_schema.properties), ['invoice_number', 'total']);

  nock(API_BASE)
    .get(`/api/v1/outcome-jobs/${JOB}`)
    .reply(200, { job_id: JOB, state: 'completed', credits_charged: 1, errors: [] })
    .get(`/api/v1/outcome-jobs/${JOB}/results`)
    .reply(200, { results: [{ result_id: 'r1', format: 'json', filename: 'inv.json', kind: 'file' }] })
    .get(`/api/v1/outcome-jobs/${JOB}/results/r1/content`)
    .reply(200, { format: 'json', text: null, data: { invoice_number: 'INV-9', total: 12.5, _meta: { pages: 1 } } });

  const result = await appTester(App.creates.extract_custom_data.operation.performResume, {
    authData,
    outputData: { job_id: JOB },
    cleanedRequest: { job_id: JOB },
  });
  assert.equal(result.invoice_number, 'INV-9');
  assert.equal(result.total, 12.5);
  assert.equal(result._meta, undefined);
});

test('a field name without English letters is a clear error', async () => {
  await assert.rejects(
    appTester(App.creates.extract_custom_data.operation.perform, {
      authData,
      inputData: { file: 'https://files.example.com/inv.pdf', fields: [{ name: 'اسم' }] },
    }),
    /English letters/,
  );
});

test('job finished trigger returns finished jobs newest first with stable ids', async () => {
  nock(API_BASE)
    .get('/api/v1/outcome-jobs')
    .query({ page: 1, page_size: 50 })
    .reply(200, {
      jobs: [
        { job_id: 'a', state: 'completed', completed_at: '2026-10-07T10:00:00Z' },
        { job_id: 'b', state: 'processing', completed_at: null },
        { job_id: 'c', state: 'failed', completed_at: '2026-10-07T11:00:00Z' },
        { job_id: 'd', state: 'partial', completed_at: '2026-10-07T12:00:00Z' },
      ],
    });

  const jobs = await appTester(App.triggers.job_finished.operation.perform, { authData, inputData: {} });

  assert.deepEqual(jobs.map((j) => j.id), ['d:partial', 'a:completed']);
});

test('the hydrator stashes the signed file without sending the API key there', async () => {
  // z.stashFile needs Zapier's runtime, so drive the hydrator with a stub z.
  const { downloadResult } = require('../lib/results');
  const { addApiKey } = require('../lib/middleware');
  const requests = [];
  const z = {
    request: async (options) => {
      const prepared = addApiKey({ ...options, headers: {} }, null, { authData });
      requests.push(prepared);
      if (prepared.url.endsWith('/download')) {
        return { data: { url: 'https://storage.example/obj?sig=1', filename: 'a.pdf', media_type: 'application/pdf; x=1', size_bytes: 3 } };
      }
      return { content: 'PDF' };
    },
    stashFile: async (file, size, name, type) => {
      await file;
      return { size, name, type };
    },
  };

  const stashed = await downloadResult(z, { inputData: { jobId: JOB, resultId: 'r1' } });

  assert.deepEqual(stashed, { size: 3, name: 'a.pdf', type: 'application/pdf' });
  assert.equal(requests[0].headers.Authorization, `Bearer ${KEY}`);
  assert.equal(requests[1].url, 'https://storage.example/obj?sig=1');
  assert.equal(requests[1].headers.Authorization, undefined);
  assert.equal(requests[1].headers['X-ScribeTools-Client'], undefined);
});
