// Retries a database operation when it fails due to a transient write
// conflict / deadlock. MongoDB (via Prisma) surfaces these as P2034 or a
// "write conflict"/"deadlock" message — they happen when two requests touch
// the same rows at once (e.g. a user double-clicks a status-update button).
// Retrying with a short backoff lets the operation succeed instead of bubbling
// a scary "Transaction failed due to a write conflict or deadlock" error to the UI.
const isWriteConflict = (err) => {
  const code = err?.code;
  const msg = (err?.message || '').toLowerCase();
  return code === 'P2034' || msg.includes('write conflict') || msg.includes('deadlock');
};

async function withWriteRetry(fn, { retries = 3, baseDelayMs = 60 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (isWriteConflict(err) && attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, baseDelayMs * attempt));
        continue;
      }
      throw err;
    }
  }
}

// Retries ANY failure (not just write conflicts) with exponential backoff.
// For fire-and-forget side effects (audit logs, notifications) that run after
// a committed transaction: the data is already saved, so a transient network
// blip should not silently drop the audit record.
async function withRetry(fn, { retries = 3, baseDelayMs = 200 } = {}) {
  let attempt = 0;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (attempt < retries) {
        attempt += 1;
        await new Promise((r) => setTimeout(r, baseDelayMs * 2 ** (attempt - 1)));
        continue;
      }
      throw err;
    }
  }
}

module.exports = { withWriteRetry, isWriteConflict, withRetry };
