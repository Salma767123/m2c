'use client'

import { X, Download, FileText, Loader2, ExternalLink } from 'lucide-react'
import { useEffect, useState } from 'react'
import { downloadDoc, isDocImageUrl } from '@/lib/docDownload'
import dynamic from 'next/dynamic'

const QCPdfViewer = dynamic(() => import('./QCPdfViewer'), { ssr: false })

interface Props {
  url: string
  name: string
  onClose: () => void
  /** When true, hides all download actions — view-only mode for QC checkers */
  readOnly?: boolean
}

function extFromName(name: string): string {
  const i = name.lastIndexOf('.')
  return i >= 0 ? name.slice(i).toLowerCase() : ''
}

function extFromUrl(url: string): string {
  try {
    const last = new URL(url).pathname.split('/').pop() || ''
    const i = last.lastIndexOf('.')
    return i >= 0 ? last.slice(i).toLowerCase() : ''
  } catch { return '' }
}

function getProxyUrl(url: string): string {
  try {
    if (/^res\.cloudinary\.com$/i.test(new URL(url).hostname)) {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '')
      return `${base}/document-proxy?${new URLSearchParams({ url })}`
    }
  } catch { /* non-Cloudinary: use direct URL */ }
  return url
}

export default function DocViewerModal({ url, name, onClose, readOnly = false }: Props) {
  const isImage = isDocImageUrl(url, name)
  const ext = extFromName(name) || extFromUrl(url)
  const isPdf = ext === '.pdf'
  const isWord = ext === '.doc' || ext === '.docx'

  // Microsoft Office Online can only fetch publicly accessible URLs — not local blob/data URIs
  const isLocal = url.startsWith('data:') || url.startsWith('blob:')
  const officeOnlineUrl = isWord && !isLocal
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(url)}`
    : null

  const [blobUrl, setBlobUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState(false)

  useEffect(() => {
    setBlobUrl(null)
    setFetchError(false)

    // data URIs and blob URLs work directly in the iframe — no fetch needed
    if (url.startsWith('data:') || url.startsWith('blob:')) {
      setBlobUrl(url)
      return
    }

    // Images render via <img> — no blob fetch required
    if (isImage) return

    // Word docs are rendered via Office Online — no local fetch needed
    if (isWord) return

    // Non-PDF, non-image, non-Word: nothing to embed — handled by the fallback UI
    if (!isPdf) return

    // PDFs: fetch through proxy and create a local blob URL.
    // Putting the proxy URL directly in an <iframe> triggers the backend's
    // frame-ancestors CSP header (which allows only same-origin framing).
    // A blob URL is same-origin to the frontend, so it is always allowed.
    setLoading(true)
    let objectUrl: string | null = null

    fetch(getProxyUrl(url), { credentials: 'include' })
      .then(res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.blob()
      })
      .then(blob => {
        objectUrl = URL.createObjectURL(blob)
        setBlobUrl(objectUrl)
      })
      .catch(() => {
        setFetchError(true)
      })
      .finally(() => {
        setLoading(false)
      })

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [url, isImage, isPdf, isWord])

  return (
    <div className="fixed inset-0 z-[9999] flex flex-col">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm" onClick={onClose} />

      {/* Viewer shell */}
      <div className="relative flex flex-col w-full h-full">

        {/* Header */}
        <div className="flex items-center justify-between bg-white border-b border-slate-200 px-4 py-3 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="w-4 h-4 text-slate-500 shrink-0" />
            <span className="text-sm font-semibold text-slate-900 truncate max-w-xs">{name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-4">
            {!readOnly && (
              <button
                type="button"
                onClick={() => downloadDoc(url, name)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
              >
                <Download className="w-3 h-3" />
                Download
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Close viewer"
            >
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="relative flex-1 overflow-hidden flex items-center justify-center bg-slate-800 p-2">
          {loading ? (
            <div className="flex flex-col items-center gap-3 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin" />
              <p className="text-sm font-medium">Loading document…</p>
            </div>
          ) : isImage ? (
            <img
              src={url}
              alt={name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
            />
          ) : isPdf && blobUrl && readOnly ? (
            <div className="absolute inset-0">
              <QCPdfViewer blobUrl={blobUrl} />
            </div>
          ) : isPdf && blobUrl ? (
            <iframe
              src={blobUrl}
              title={name}
              className="w-full h-full rounded-lg bg-white shadow-xl border-0"
            />
          ) : officeOnlineUrl ? (
            <iframe
              src={officeOnlineUrl}
              title={name}
              className="w-full h-full rounded-lg bg-white shadow-xl border-0"
            />
          ) : (
            /* Non-PDF / non-image / non-Word / fetch error */
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 max-w-sm w-full">
              <FileText className="w-14 h-14 text-slate-200 mx-auto" />
              <div>
                <p className="font-bold text-slate-800 text-lg">Preview not available</p>
                <p className="text-sm text-slate-500 mt-1">
                  {fetchError
                    ? 'The document could not be loaded. It may be unavailable.'
                    : `${ext ? ext.slice(1).toUpperCase() + ' files' : 'This file type'} cannot be previewed in the browser.`}
                </p>
              </div>
              {readOnly ? (
                /* QC checker: open in a new browser tab (no download trigger) */
                <a
                  href={getProxyUrl(url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-sm"
                >
                  <ExternalLink className="w-4 h-4" />
                  Open in Browser
                </a>
              ) : (
                <button
                  type="button"
                  onClick={() => downloadDoc(url, name)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  Download File
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
