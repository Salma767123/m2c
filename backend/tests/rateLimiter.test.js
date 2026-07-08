const test = require('node:test');
const assert = require('node:assert/strict');

const { createRateLimiter } = require('../middleware/rateLimiter');
const { withRetry } = require('../utils/dbRetry');

function mockReqRes({ ip = '1.2.3.4', body = {} } = {}) {
  const req = { headers: { 'x-forwarded-for': ip }, body, socket: {} };
  const res = {
    statusCode: null,
    headers: {},
    body: null,
    set(k, v) { this.headers[k] = v; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
  };
  return { req, res };
}

test('allows requests under the limit and blocks the request over it', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });
  let passed = 0;

  for (let i = 0; i < 3; i++) {
    const { req, res } = mockReqRes();
    limiter(req, res, () => { passed += 1; });
    assert.equal(res.statusCode, null);
  }
  assert.equal(passed, 3);

  const { req, res } = mockReqRes();
  limiter(req, res, () => { passed += 1; });
  assert.equal(res.statusCode, 429);
  assert.equal(res.body.success, false);
  assert.ok(res.headers['Retry-After']);
  assert.equal(passed, 3, 'next() must not be called once limited');
});

test('buckets are isolated per IP', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

  const a = mockReqRes({ ip: '10.0.0.1' });
  const b = mockReqRes({ ip: '10.0.0.2' });
  let aPassed = false;
  let bPassed = false;

  limiter(a.req, a.res, () => { aPassed = true; });
  limiter(b.req, b.res, () => { bPassed = true; });

  assert.ok(aPassed && bPassed, 'different IPs must not share a bucket');
});

test('buckets are isolated per account identifier (email)', () => {
  const limiter = createRateLimiter({ windowMs: 60_000, max: 1 });

  const first = mockReqRes({ body: { email: 'a@x.com' } });
  const second = mockReqRes({ body: { email: 'b@x.com' } });
  let passed = 0;

  limiter(first.req, first.res, () => { passed += 1; });
  limiter(second.req, second.res, () => { passed += 1; });

  assert.equal(passed, 2);
});

test('withRetry: succeeds after transient failures', async () => {
  let attempts = 0;
  const result = await withRetry(async () => {
    attempts += 1;
    if (attempts < 3) throw new Error('transient');
    return 'ok';
  }, { retries: 3, baseDelayMs: 1 });

  assert.equal(result, 'ok');
  assert.equal(attempts, 3);
});

test('withRetry: gives up after exhausting retries', async () => {
  let attempts = 0;
  await assert.rejects(
    withRetry(async () => {
      attempts += 1;
      throw new Error('permanent');
    }, { retries: 2, baseDelayMs: 1 }),
    /permanent/
  );
  assert.equal(attempts, 3); // initial try + 2 retries
});
