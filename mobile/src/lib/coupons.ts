/**
 * Coupon helpers.
 *
 * `GET /coupons/promotional` returns `{ message, image, link }` — it does NOT
 * return the coupon code as its own field. The code appears inside `message`
 * only on the branch where the coupon has no admin description:
 *
 *   description set   → message is the admin's text  (code absent)
 *   description empty → "Use code SAVE10 for 10% off" (code present)
 *
 * So any client that wants to show or pre-fill a code has to recover it from
 * prose. That is inherently lossy — a coupon with a description simply has no
 * code to find, and callers must handle `undefined`.
 *
 * The durable fix is server-side (return `code` alongside `message`); until
 * then this keeps the guesswork in one place instead of two components.
 */

/**
 * Best-effort recovery of a promo code from a promotional message.
 * Returns undefined when nothing can be identified with confidence.
 */
export function extractCouponCode(message: string): string | undefined {
  if (!message) return undefined;

  // Most reliable: the token immediately after the word "code" — this is the
  // shape the backend's own fallback string produces.
  const afterKeyword = message.match(/\bcode\s+([A-Za-z0-9][A-Za-z0-9-]{3,})\b/i)?.[1];
  if (afterKeyword) return afterKeyword.toUpperCase();

  // Fallback: a standalone uppercase token containing BOTH a letter and a digit.
  // Real codes almost always mix the two, which keeps ordinary shouted words
  // ("FESTIVE", "SALE", "OFFER") from being mistaken for a code.
  return message.match(/\b(?=[A-Z0-9]*[A-Z])(?=[A-Z0-9]*[0-9])[A-Z0-9]{4,}\b/)?.[0];
}
