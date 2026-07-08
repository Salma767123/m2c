/**
 * Module-level singleton that lets openDoc() signal DocViewerProvider
 * to open the in-app viewer modal without React prop-drilling.
 *
 * DocViewerProvider registers a handler on mount; openDoc() calls it.
 * Only one handler is active at a time (the mounted provider).
 */
type OpenFn = (url: string, name: string) => void

let _handler: OpenFn | null = null

export const docViewerBus = {
  register:   (fn: OpenFn) => { _handler = fn },
  unregister: ()           => { _handler = null },
  open:       (url: string, name: string) => _handler?.(url, name),
}

/**
 * Open a document/image in the in-app DocViewerModal (mounted once via
 * DocViewerProvider in the root layout). Falls back to a new tab only if
 * the provider is not mounted, so a click never becomes a dead end.
 */
export function openDoc(url: string, name: string) {
  if (_handler) {
    _handler(url, name)
  } else if (typeof window !== 'undefined') {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}
