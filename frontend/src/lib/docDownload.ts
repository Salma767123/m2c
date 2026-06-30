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

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|bmp|svg)(\?|$)/i
const DOC_EXT   = /\.(pdf|docx?|xlsx?|pptx?|txt|csv|rtf)(\?|$)/i

function extFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop() || ''
    const i = last.lastIndexOf('.')
    return i >= 0 ? last.slice(i).toLowerCase() : ''
  } catch { return '' }
}

/**
 * Open a document inline in a new tab.
 * Fetches the file as a blob first so the browser always shows it inline,
 * bypassing any server-side Content-Disposition: attachment header (which
 * Cloudinary sets by default on raw resources, causing PDFs to download as
 * extensionless files that the OS cannot open).
 */
export async function openDoc(url: string): Promise<void> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const blobUrl = URL.createObjectURL(blob)
    window.open(blobUrl, '_blank', 'noopener,noreferrer')
    setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
}

/**
 * Download a document with the correct filename and file extension.
 * Extension is inferred from the URL path first, then from the blob MIME type
 * as a fallback (handles Cloudinary URLs whose public_id has no extension).
 * Falls back to opening in a new tab on CORS / network failure.
 */
export async function downloadDoc(url: string, name: string): Promise<void> {
  try {
    const res = await fetch(url)
    const blob = await res.blob()
    const ext = extFromUrl(url) || (MIME_TO_EXT[blob.type] ?? '')
    const filename = ext && !name.toLowerCase().endsWith(ext) ? name + ext : name
    const blobUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = blobUrl
    a.download = filename
    a.click()
    setTimeout(() => URL.revokeObjectURL(blobUrl), 1000)
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer')
  }
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

  // 1–2. Filename check (most reliable — the vendor chose the original filename)
  if (name) {
    if (DOC_EXT.test(name)) return false
    if (IMAGE_EXT.test(name)) return true
  }

  // 3–4. URL extension check
  if (DOC_EXT.test(url)) return false
  if (IMAGE_EXT.test(url)) return true

  // 5–6. Cloudinary path type check (for extension-less public_ids)
  try {
    const pathname = new URL(url).pathname
    if (/\/raw\/upload\//.test(pathname)) return false
    if (/\/image\/upload\//.test(pathname)) return true
  } catch { /* relative URL or malformed — fall through */ }

  return false
}
