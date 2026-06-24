// Shared time-series bucketing for the vendor Revenue/Orders trend charts so the
// Dashboard and Reports modules use identical date-filtering, grouping, and
// timeline logic (zero-filled, contiguous buckets across the whole range).

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const startOfDay = (d) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};

// Choose grouping from the span of the selected range:
//   ≤ 31 days  → daily
//   ≤ 92 days  (≈3 months) → weekly
//   otherwise  → monthly
const pickGranularity = (spanDays) => (spanDays <= 31 ? 'day' : spanDays <= 92 ? 'week' : 'month');

/**
 * Build contiguous, sorted buckets covering [startDate, endDate] at the given
 * granularity ('day' | 'week' | 'month'). Each bucket has a display label and
 * its half-open [start, end) boundaries. Buckets are emitted even when empty,
 * so the timeline never skips dates/months.
 */
const buildBuckets = (granularity, startDate, endDate, multiYear) => {
  const buckets = [];
  if (granularity === 'day' || granularity === 'week') {
    const step = granularity === 'week' ? 7 : 1;
    let cursor = startOfDay(startDate);
    const limit = endOfDay(endDate);
    while (cursor <= limit) {
      const next = new Date(cursor);
      next.setDate(next.getDate() + step);
      buckets.push({
        start: new Date(cursor),
        end: new Date(next),
        label: `${cursor.getDate()} ${MONTH_LABELS[cursor.getMonth()]}`,
      });
      cursor = next;
    }
  } else {
    let cursor = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const lastMonth = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
    while (cursor <= lastMonth) {
      const next = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({
        start: new Date(cursor),
        end: new Date(next),
        label: multiYear
          ? `${MONTH_LABELS[cursor.getMonth()]} '${String(cursor.getFullYear()).slice(2)}`
          : MONTH_LABELS[cursor.getMonth()],
      });
      cursor = next;
    }
  }
  return buckets;
};

/**
 * Returns a function mapping a date → bucket index for the given buckets.
 * Index < 0 or ≥ buckets.length means the date is outside the range.
 */
const makeIndexer = (granularity, buckets) => {
  const firstStart = buckets.length ? buckets[0].start.getTime() : 0;
  const dayMs = 86400000;
  return (date) => {
    if (!buckets.length) return -1;
    if (granularity === 'day') {
      return Math.floor((startOfDay(date).getTime() - firstStart) / dayMs);
    }
    if (granularity === 'week') {
      return Math.floor((startOfDay(date).getTime() - firstStart) / (dayMs * 7));
    }
    return (
      (date.getFullYear() - buckets[0].start.getFullYear()) * 12 +
      (date.getMonth() - buckets[0].start.getMonth())
    );
  };
};

module.exports = { MONTH_LABELS, startOfDay, endOfDay, pickGranularity, buildBuckets, makeIndexer };
