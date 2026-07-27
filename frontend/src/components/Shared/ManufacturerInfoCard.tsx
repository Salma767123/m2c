'use client'

import { Factory, User } from 'lucide-react'
import { ManufacturerInfo, hasManufacturerInfo, manufacturerDisplayName } from '@/lib/manufacturerInfo'

interface Props {
  info?: ManufacturerInfo | null
  /**
   * 'section' — a full titled card (the default; for detail/report pages).
   * 'plain'   — just the inner content, no card chrome (drop inside an existing section).
   */
  variant?: 'section' | 'plain'
  /** Card title (section variant only). */
  title?: string
  className?: string
}

/**
 * Read-only display of a product's manufacturer ("who made it"). One component, dropped
 * onto every product/inspection surface so they stay identical by construction. Renders
 * nothing when there's no manufacturer data, so callers can place it unconditionally.
 */
export default function ManufacturerInfoCard({
  info,
  variant = 'section',
  title = 'Manufacturer Information',
  className = '',
}: Props) {
  if (!hasManufacturerInfo(info)) return null
  const m = info as ManufacturerInfo
  const name = manufacturerDisplayName(m)

  const body = (
    <div className="flex items-start gap-4">
      {/* Photo */}
      <div className="shrink-0">
        {m.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={m.photo}
            alt={name || 'Manufacturer'}
            className="w-16 h-16 rounded-full object-cover border border-slate-200"
          />
        ) : (
          <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400">
            <User className="w-7 h-7" />
          </div>
        )}
      </div>

      {/* Text */}
      <div className="min-w-0 flex-1">
        <p className="font-semibold text-slate-900 truncate">{name || '—'}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-slate-600">
          {m.role && m.role.trim() && (
            <span><span className="text-slate-400">Role:</span> {m.role}</span>
          )}
          {m.experience && m.experience.trim() && (
            <span><span className="text-slate-400">Experience:</span> {m.experience}</span>
          )}
        </div>
        {m.description && m.description.trim() && (
          <p className="mt-2 text-sm text-slate-600 leading-relaxed whitespace-pre-line">{m.description}</p>
        )}
      </div>
    </div>
  )

  if (variant === 'plain') {
    return <div className={className}>{body}</div>
  }

  return (
    <div className={`bg-white rounded-xl border border-slate-200 overflow-hidden ${className}`}>
      <div className="p-4 border-b border-slate-100">
        <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
          <span className="text-slate-500"><Factory className="w-4 h-4" /></span>
          {title}
        </h2>
      </div>
      <div className="p-4">{body}</div>
    </div>
  )
}
