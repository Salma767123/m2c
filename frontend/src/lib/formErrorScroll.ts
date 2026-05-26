/**
 * Scroll-to-first-error utility for form submission.
 *
 * Picks the first invalid field, smooth-scrolls it into view, and moves
 * focus to the appropriate control inside it. Works across plain inputs,
 * custom chip groups, dropzones, and dropdowns by trying a series of
 * selectors in order.
 *
 * Drop-in pattern used after `setErrors(...)` on submit:
 *
 *   const newErrors = validateAll(formData);
 *   if (Object.keys(newErrors).length > 0) {
 *     setErrors(newErrors);
 *     scrollToFirstError(newErrors);
 *     return;
 *   }
 */

export interface ScrollToFirstErrorOptions {
  /**
   * Field-name → CSS selector (or list of selectors to try in order).
   * Overrides the default `[name="..."]` / `#...` / `[data-field="..."]`
   * lookup for fields whose visible control doesn't match the field name.
   */
  selectorMap?: Record<string, string | string[]>;
  /** Scroll vertical alignment. Defaults to "center". */
  block?: ScrollLogicalPosition;
  /**
   * Ordered list of field names — when the errors object doesn't have a
   * predictable iteration order, pass DOM order here so "first error"
   * means visually-topmost, not insertion-first.
   */
  fieldOrder?: string[];
}

const defaultSelectorsFor = (field: string): string[] => [
  `[data-field="${field}"]`,
  `[name="${field}"]`,
  `#${field}`,
];

function findTarget(field: string, opts: ScrollToFirstErrorOptions): HTMLElement | null {
  const override = opts.selectorMap?.[field];
  const selectors: string[] = override
    ? Array.isArray(override)
      ? override
      : [override]
    : defaultSelectorsFor(field);

  for (const sel of selectors) {
    const el = document.querySelector<HTMLElement>(sel);
    if (el) return el;
  }
  return null;
}

/**
 * Scroll the first invalid field into view and focus a control inside it.
 * Returns true if a target was found and scrolled, false otherwise.
 */
export function scrollToFirstError(
  errors: Record<string, string>,
  options: ScrollToFirstErrorOptions = {},
): boolean {
  // Determine ordering of error fields. `fieldOrder` (if supplied) gives
  // visual order; otherwise we trust the object's own iteration order.
  const errorKeys = Object.keys(errors).filter((k) => !!errors[k]);
  if (errorKeys.length === 0) return false;

  const ordered = options.fieldOrder
    ? options.fieldOrder.filter((f) => errorKeys.includes(f))
    : errorKeys;

  const first = ordered[0] ?? errorKeys[0];
  const target = findTarget(first, options);
  if (!target) return false;

  target.scrollIntoView({
    behavior: 'smooth',
    block: options.block ?? 'center',
  });

  // Defer focus to after the smooth-scroll animation kicks off so the
  // browser doesn't fight the scroll. preventScroll keeps the smooth
  // animation in charge of positioning.
  requestAnimationFrame(() => {
    const focusable =
      target instanceof HTMLInputElement ||
      target instanceof HTMLButtonElement ||
      target instanceof HTMLTextAreaElement ||
      target instanceof HTMLSelectElement ||
      target instanceof HTMLAnchorElement
        ? target
        : target.querySelector<HTMLElement>(
            'input:not([type="hidden"]),button:not([disabled]),textarea,select,a[href],[tabindex]:not([tabindex="-1"])',
          );
    focusable?.focus({ preventScroll: true });
  });

  return true;
}
