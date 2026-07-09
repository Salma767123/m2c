// Lightweight in-memory rate limiter for authentication endpoints.
//
// Purpose: slow down credential brute-forcing on /login, /register and the
// password-reset endpoints. Limits are deliberately generous so real users
// (shared office IPs, flaky networks with retries) are never affected —
// only scripted guessing trips them.
//
// Note on serverless: each warm instance keeps its own counters, so the
// effective global limit is (max × instance count). That still breaks
// brute-force attempts, which need thousands of sequential tries against
// the same account, without adding a Redis dependency.

const WINDOW_CLEANUP_MS = 10 * 60 * 1000; // sweep stale buckets every 10 min

function clientIp(req) {
  // Vercel/most proxies put the real client first in x-forwarded-for.
  const fwd = req.headers['x-forwarded-for'];
  if (typeof fwd === 'string' && fwd.length > 0) {
    return fwd.split(',')[0].trim();
  }
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

/**
 * Create a fixed-window rate limiter middleware.
 * @param {object} opts
 * @param {number} opts.windowMs  window length in ms
 * @param {number} opts.max       allowed requests per window per key
 * @param {string} [opts.message] error message returned on 429
 * @param {boolean} [opts.keyByBodyIdentifier] also bucket by email/checkerId
 *   from the request body, so one IP hammering many accounts and many IPs
 *   hammering one account are both caught.
 */
function createRateLimiter({ windowMs, max, message, keyByBodyIdentifier = true }) {
  const buckets = new Map(); // key -> { count, resetAt }

  const sweep = setInterval(() => {
    const now = Date.now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(key);
    }
  }, WINDOW_CLEANUP_MS);
  // Never keep the process alive just for the sweeper (matters for scripts/tests).
  if (typeof sweep.unref === 'function') sweep.unref();

  return function rateLimiter(req, res, next) {
    const now = Date.now();
    const identifier = keyByBodyIdentifier
      ? String(req.body?.email || req.body?.checkerId || '').toLowerCase()
      : '';
    const key = `${clientIp(req)}|${identifier}`;

    let bucket = buckets.get(key);
    if (!bucket || bucket.resetAt <= now) {
      bucket = { count: 0, resetAt: now + windowMs };
      buckets.set(key, bucket);
    }

    bucket.count += 1;
    if (bucket.count > max) {
      const retryAfterSec = Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
      res.set('Retry-After', String(retryAfterSec));
      return res.status(429).json({
        success: false,
        error: message || 'Too many attempts. Please try again later.',
      });
    }

    next();
  };
}

// Shared limiter instances (one bucket store per concern, reused across routers)
const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts. Please try again in a few minutes.',
});

const passwordResetLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many password reset attempts. Please try again in a few minutes.',
});

const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 30,
  message: 'Too many registration attempts. Please try again later.',
});

// Direct-to-Cloudinary upload signatures. One registration needs a signature per
// distinct folder (up to ~12), so this must be far more generous than the
// registration limiter while still bounding abuse of the signing endpoint.
const uploadSignatureLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 300,
  message: 'Too many upload requests. Please try again later.',
});

module.exports = {
  createRateLimiter,
  loginLimiter,
  passwordResetLimiter,
  registerLimiter,
  uploadSignatureLimiter,
};
