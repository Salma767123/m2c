"use client"

import { FileText, ImageIcon, Download } from "lucide-react"

// Renders support-ticket attachments (Cloudinary URLs). Images show a thumbnail;
// everything else (PDF/doc) shows a file chip. Both open in a new tab.
const isImage = (url: string) => /\.(png|jpe?g|gif|webp|avif|bmp|svg)(\?|$)/i.test(url)
const fileName = (url: string) => {
  try { return decodeURIComponent(url.split("/").pop()?.split("?")[0] || "attachment") }
  catch { return "attachment" }
}

export default function TicketAttachments({ urls, dark = false }: { urls?: string[]; dark?: boolean }) {
  if (!urls || urls.length === 0) return null
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {urls.map((url, i) => (
        isImage(url) ? (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-16 h-16 rounded-lg overflow-hidden border border-slate-200 hover:ring-2 hover:ring-brand-500/40 transition"
            title={fileName(url)}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={fileName(url)} className="w-full h-full object-cover" />
          </a>
        ) : (
          <a
            key={i}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-medium transition ${
              dark
                ? "border-white/30 text-white hover:bg-white/10"
                : "border-slate-200 text-slate-700 hover:bg-slate-50"
            }`}
            title={fileName(url)}
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span className="max-w-[140px] truncate">{fileName(url)}</span>
            <Download className="w-3.5 h-3.5 shrink-0 opacity-60" />
          </a>
        )
      ))}
    </div>
  )
}

export { isImage as isImageAttachment, fileName as attachmentFileName, ImageIcon }
