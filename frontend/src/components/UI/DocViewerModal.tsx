'use client'

import { X, Download, FileText } from 'lucide-react'
import { downloadDoc, isDocImageUrl } from '@/lib/docDownload'

interface Props {
  url: string
  name: string
  onClose: () => void
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

function getProxySrc(url: string): string {
  try {
    if (/^res\.cloudinary\.com$/i.test(new URL(url).hostname)) {
      const base = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5001/api').replace(/\/+$/, '')
      return `${base}/document-proxy?${new URLSearchParams({ url })}`
    }
  } catch { /* non-Cloudinary: use direct URL */ }
  return url
}

export default function DocViewerModal({ url, name, onClose }: Props) {
  const isImage = isDocImageUrl(url, name)
  const ext = extFromName(name) || extFromUrl(url)
  const isPdf = ext === '.pdf'
  const viewSrc = getProxySrc(url)

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
            <button
              type="button"
              onClick={() => downloadDoc(url, name)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 transition-colors"
            >
              <Download className="w-3 h-3" />
              Download
            </button>
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
        <div className="flex-1 overflow-hidden flex items-center justify-center bg-slate-800 p-2">
          {isImage ? (
            <img
              src={url}
              alt={name}
              className="max-w-full max-h-full object-contain rounded-lg shadow-xl"
            />
          ) : isPdf ? (
            <iframe
              src={viewSrc}
              title={name}
              className="w-full h-full rounded-lg bg-white shadow-xl border-0"
            />
          ) : (
            /* Non-PDF, non-image — DOCX/DOC/etc. can't be rendered by the browser */
            <div className="bg-white rounded-2xl shadow-xl p-8 text-center space-y-4 max-w-sm w-full">
              <FileText className="w-14 h-14 text-slate-200 mx-auto" />
              <div>
                <p className="font-bold text-slate-800 text-lg">Preview not available</p>
                <p className="text-sm text-slate-500 mt-1">
                  {ext ? `${ext.slice(1).toUpperCase()} files` : 'This file type'} cannot be previewed in the browser.
                </p>
              </div>
              <button
                type="button"
                onClick={() => downloadDoc(url, name)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors shadow-sm"
              >
                <Download className="w-4 h-4" />
                Download File
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
