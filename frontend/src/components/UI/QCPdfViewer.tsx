'use client'

/**
 * QCPdfViewer — view-only PDF renderer for Quality Checkers.
 *
 * Renders each page onto a <canvas> via PDF.js so the browser's native PDF
 * toolbar (download / print / open-in-tab) is never shown.  Right-click and
 * keyboard print shortcuts are suppressed on the canvas area.
 */

import { useEffect, useRef, useState } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
} from 'lucide-react'

// ── PDF.js bootstrap ──────────────────────────────────────────────────────────
// Loaded lazily so the ~1 MB library only enters the bundle when the viewer
// is actually mounted.  The worker is served from /public so Next.js never
// tries to bundle it.
let pdfjsLib: any = null

async function getPdfjs() {
  if (pdfjsLib) return pdfjsLib
  const lib = await import('pdfjs-dist')
  lib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'
  pdfjsLib = lib
  return lib
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  /** Blob URL of the already-fetched PDF (never the original Cloudinary URL) */
  blobUrl: string
}

const DEFAULT_SCALE = 1.0

export default function QCPdfViewer({ blobUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const renderTaskRef = useRef<any>(null)
  const pdfDocRef = useRef<any>(null)

  const [numPages, setNumPages] = useState(0)
  const [currentPage, setCurrentPage] = useState(1)
  const [scale] = useState(DEFAULT_SCALE)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [rendering, setRendering] = useState(false)

  // ── Load PDF document ──────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const lib = await getPdfjs()
        const doc = await lib.getDocument({ url: blobUrl }).promise
        if (cancelled) return
        pdfDocRef.current = doc
        setNumPages(doc.numPages)
        setCurrentPage(1)
      } catch (e: any) {
        if (!cancelled) setError(e?.message || 'Failed to load PDF')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [blobUrl])

  // ── Render the current page ───────────────────────────────────────────────
  useEffect(() => {
    if (loading || !pdfDocRef.current || !canvasRef.current) return

    let cancelled = false

    const render = async () => {
      // Cancel any in-flight render
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch { /* ignore */ }
        renderTaskRef.current = null
      }

      setRendering(true)
      try {
        const page = await pdfDocRef.current.getPage(currentPage)
        if (cancelled) return

        const viewport = page.getViewport({ scale })
        const canvas = canvasRef.current!
        const ctx = canvas.getContext('2d')!

        canvas.width = viewport.width
        canvas.height = viewport.height

        const task = page.render({ canvasContext: ctx, viewport })
        renderTaskRef.current = task
        await task.promise
        renderTaskRef.current = null
      } catch (e: any) {
        if (e?.name !== 'RenderingCancelledException') {
          console.error('PDF render error:', e)
        }
      } finally {
        if (!cancelled) setRendering(false)
      }
    }

    render()

    return () => {
      cancelled = true
      if (renderTaskRef.current) {
        try { renderTaskRef.current.cancel() } catch { /* ignore */ }
      }
    }
  }, [loading, currentPage, scale])

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (p: number) => {
    const clamped = Math.max(1, Math.min(numPages, p))
    setCurrentPage(clamped)
  }

  // ── Prevent right-click on the canvas ────────────────────────────────────
  const blockCtx = (e: React.MouseEvent) => e.preventDefault()

  // ── Block Ctrl+P / Cmd+P keyboard shortcut ───────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === 'p' || e.key === 's')) {
        e.preventDefault()
        e.stopPropagation()
      }
    }
    window.addEventListener('keydown', handler, { capture: true })
    return () => window.removeEventListener('keydown', handler, { capture: true })
  }, [])

  // ── States ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin" />
        <p className="text-sm font-medium">Loading PDF…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-400">
        <AlertTriangle className="w-8 h-8 text-amber-400" />
        <p className="text-sm font-medium text-slate-600">Could not render PDF</p>
        <p className="text-xs text-slate-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full bg-slate-800 select-none">

      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-center gap-1 bg-slate-900/90 backdrop-blur-sm px-3 py-2 shrink-0 flex-wrap">

        {/* Navigation */}
        <button
          type="button"
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors"
          title="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        <span className="text-xs text-slate-300 font-medium px-2 tabular-nums">
          {currentPage} / {numPages}
        </span>

        <button
          type="button"
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= numPages}
          className="p-1.5 rounded-lg text-slate-300 hover:bg-slate-700 disabled:opacity-30 transition-colors"
          title="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {rendering && (
          <>
            <div className="w-px h-4 bg-slate-600 mx-1" />
            <Loader2 className="w-3.5 h-3.5 text-slate-400 animate-spin" />
          </>
        )}
      </div>

      {/* ── Canvas area ────────────────────────────────────────────────── */}
      <div
        className="flex-1 overflow-auto flex justify-center py-4 px-4"
        onContextMenu={blockCtx}
      >
        <canvas
          ref={canvasRef}
          onContextMenu={blockCtx}
          className="shadow-2xl rounded-sm max-w-full"
          style={{ display: 'block', cursor: 'default', userSelect: 'none' }}
        />
      </div>
    </div>
  )
}
