/**
 * Which element actually scrolls the storefront, and how to send it to the top.
 *
 * Normally the answer is <html> and nobody has to think about it. Not here:
 * globals.css sets `overflow-x: hidden` on both <html> and <body>, which the
 * overflow spec promotes to `overflow-y: auto` on the other axis, and the
 * layout gives both `h-full`. A body fixed at viewport height, holding taller
 * content, with overflow-y auto, is a scroll container — so the page scrolls
 * inside <body> while <html> never moves.
 *
 * Measured, to be sure of it rather than to argue about it:
 *
 *     body: { scrollHeight: 2113, clientHeight: 900 }   <- scrolls
 *     html: { scrollHeight:  900, clientHeight: 900 }   <- never moves
 *
 * The consequence is that `window.scrollY` is permanently 0 and
 * `window.scrollTo` does nothing at all — silently, which is how a dead "back
 * to top" control can sit in a page for a long time without anyone noticing it
 * is dead. Ask which element has content it cannot show instead of hard-coding
 * either answer; only a real scroll container has scrollHeight past
 * clientHeight, so this stays correct if that stylesheet is ever fixed.
 */
export function pageScroller(): HTMLElement {
  const body = document.body;
  if (body.scrollHeight > body.clientHeight + 1) return body;
  return document.documentElement;
}

/** Send the page back to the top, honouring a reduced-motion preference. */
export function scrollPageToTop() {
  const reduced =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  pageScroller().scrollTo({ top: 0, behavior: reduced ? 'auto' : 'smooth' });
}
