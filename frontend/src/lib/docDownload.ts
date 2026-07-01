import { docViewerBus } from './docViewerBus'

const MIME_TO_EXT: Record<string, string> = {
  'application/pdf': '.pdf',
  'application/msword': '.doc',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
  'application/vnd.ms-excel': '.xls',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
  'image/svg+xml': '.svg',
  'image/bmp': '.bmp',
}

const EXT_TO_MIME: Record<string, string> = {
  '.pdf':  'application/pdf',
  '.doc':  'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls':  'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.ppt':  'application/vnd.ms-powerpoint',
  '.pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif':  'image/gif',
  '.webp': 'image/webp',
  '.bmp':  'image/bmp',
  '.svg':  'image/svg+xml',
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i
const DOC_EXT   = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf|zip)(\?|$)/i

function extFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop() || ''
    const i = last.lastIndexOf('.')
    return i >= 0 ? last.slice(i).toLowerCase() : ''
  } catch { return '' }
}

function isCloudinaryUrl(url: string): boolean {
  try { return /^res\.cloudinary\.com$/i.test(new URL(url).hostname) } catch { return false }
}

/**
 * Returns the backend proxy URL for a Cloudinary document.
 *
 * The proxy fetches the file server-side (no CORS restriction) and re-serves
 * it with the correct Content-Type and Content-Disposition header.
 *
 * query params:
 *   url      – encoded Cloudinary URL
 *   download – "true" to force attachment download
 *   name     – suggested filename (including extension) for the download
 */
function cloudinaryProxyUrl(
  url: string,
  opts: { download?: boolean; name?: string } = {},
): string {
  const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '')
  const params = new URLSearchParams({ url })
  if (opts.download) params.set('download', 'true')
  if (opts.name)     params.set('name', opts.name)
  return `${base}/document-proxy?${params}`
}

/**
 * Fetch a non-Cloudinary URL as a Blob.
 * Throws on non-2xx so the HTML error page is never mistaken for file content.
 * Re-types the blob when the server returns application/octet-stream.
 */
async function safeFetch(url: string): Promise<Blob> {
  const res = await fetch(url)
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const raw = await res.blob()
  if (raw.type === 'application/octet-stream' || !raw.type) {
    const mime = EXT_TO_MIME[extFromUrl(url)]
    if (mime) return new Blob([raw], { type: mime })
  }
  return raw
}

/**
 * Open a document in a new browser tab.
 *
 * Cloudinary raw resources are routed through the backend proxy so the
 * browser receives Content-Disposition: inline and can display PDFs natively.
 * The proxy also bypasses any browser CORS restriction on raw Cloudinary URLs.
 *
 * Non-Cloudinary URLs are fetched directly as a blob (to override any
 * server-side attachment disposition), with a direct-open fallback.
 */
function nameFromUrl(url: string): string {
  try {
    const raw = new URL(url).pathname.split('/').pop() || 'Document'
    return decodeURIComponent(raw.split('?')[0])
  } catch { return 'Document' }
}

/**
 * Open a document in the in-app viewer modal.
 * The optional `name` param is shown as the modal title and used as the
 * download filename — pass it whenever you have a human-readable filename.
 */
export function openDoc(url: string, name?: string): void {
  if (!url) return
  docViewerBus.open(url, name || nameFromUrl(url))
}

/**
 * Trigger a file download with the correct filename and extension.
 *
 * Cloudinary raw resources are routed through the backend proxy which sets
 * Content-Disposition: attachment; filename="<name>" and streams the file.
 * This avoids CORS issues and preserves the original filename and extension.
 *
 * Non-Cloudinary URLs are fetched as blobs so the `download` attribute is
 * honoured by the browser (cross-origin links ignore it).
 */
export function downloadDoc(url: string, name: string): void {
  if (!url) return

  if (isCloudinaryUrl(url)) {
    // Route through the backend proxy (avoids CORS on Cloudinary raw resources).
    // Fetch as a blob so the download triggers silently — no new tab opened.
    const ext = extFromUrl(url)
    const filename = ext && !name.toLowerCase().endsWith(ext) ? `${name}${ext}` : name
    const proxyUrl = cloudinaryProxyUrl(url, { download: true, name: filename })
    safeFetch(proxyUrl)
      .then(blob => {
        const blobUrl = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = blobUrl
        a.download = filename
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000)
      })
      .catch(() => window.open(proxyUrl, '_blank', 'noopener,noreferrer'))
    return
  }

  // Non-Cloudinary: blob fetch preserves filename via the download attribute
  safeFetch(url)
    .then(blob => {
      const ext = extFromUrl(url) || (MIME_TO_EXT[blob.type] ?? '')
      const filename = ext && !name.toLowerCase().endsWith(ext) ? `${name}${ext}` : name
      const blobUrl = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = blobUrl
      a.download = filename
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      setTimeout(() => URL.revokeObjectURL(blobUrl), 1_000)
    })
    .catch(() => window.open(url, '_blank', 'noopener,noreferrer'))
}

/**
 * Returns true only for URLs that point to an actual image file.
 *
 * Accepts an optional `name` (the document's display name or original filename).
 * When provided, the filename extension takes priority over URL path inspection,
 * which prevents PDFs/DOCs stored in Cloudinary's /image/upload/ bucket from
 * being treated as images.
 *
 * Decision order:
 *  1. filename has a document extension  → false  (PDF/DOC is never an image)
 *  2. filename has an image extension    → true
 *  3. URL has a document extension       → false
 *  4. URL has an image extension         → true
 *  5. Cloudinary /raw/upload/ path       → false
 *  6. Cloudinary /image/upload/ path     → true  (best-effort fallback)
 *  7. Unknown                            → false
 */
export function isDocImageUrl(url?: string, name?: string): boolean {
  if (!url) return false

  if (name) {
    if (DOC_EXT.test(name)) return false
    if (IMAGE_EXT.test(name)) return true
  }

  if (DOC_EXT.test(url)) return false
  if (IMAGE_EXT.test(url)) return true

  try {
    const pathname = new URL(url).pathname
    if (/\/raw\/upload\//.test(pathname)) return false
    if (/\/image\/upload\//.test(pathname)) return true
  } catch { /* relative URL or malformed — fall through */ }

  return false
}
