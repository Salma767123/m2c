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
