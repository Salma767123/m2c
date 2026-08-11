'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Store, Package, MapPin, Calendar, Plane } from 'lucide-react'
import { qcCheckerService, type CheckerAssignments } from '@/services/qcCheckerService'
import Dropdown from '@/components/UI/Dropdown'

// Status → badge colour. Covers both InspectionStatus and ProductApprovalStatus.
const STATUS_COLORS: Record<string, string> = {
  SCHEDULED: 'bg-blue-50 text-blue-700 ring-blue-200',
  IN_PROGRESS: 'bg-amber-50 text-amber-700 ring-amber-200',
  SUBMITTED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  UNDER_ADMIN_REVIEW: 'bg-purple-50 text-purple-700 ring-purple-200',
  COMPLETED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  REJECTED: 'bg-red-50 text-red-700 ring-red-200',
  REINSPECTION: 'bg-orange-50 text-orange-700 ring-orange-200',
  CANCELLED: 'bg-slate-100 text-slate-500 ring-slate-200',
  EXPIRED: 'bg-slate-100 text-slate-500 ring-slate-200',
  PENDING: 'bg-amber-50 text-amber-700 ring-amber-200',
  QC_APPROVED: 'bg-blue-50 text-blue-700 ring-blue-200',
  APPROVED: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  NEGOTIATION: 'bg-purple-50 text-purple-700 ring-purple-200',
}

const prettyStatus = (s?: string) => (s || '—').replace(/_/g, ' ')

function StatusBadge({ status }: { status?: string }) {
  const color = STATUS_COLORS[status || ''] || 'bg-slate-100 text-slate-600 ring-slate-200'
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ring-1 ${color}`}>
      {prettyStatus(status)}
    </span>
  )
}

const VENDOR_STATUSES = ['ALL', 'SCHEDULED', 'IN_PROGRESS', 'SUBMITTED', 'UNDER_ADMIN_REVIEW', 'COMPLETED', 'REJECTED', 'REINSPECTION', 'CANCELLED', 'EXPIRED']
const PRODUCT_STATUSES = ['ALL', 'PENDING', 'QC_APPROVED', 'NEGOTIATION', 'APPROVED', 'REJECTED', 'REINSPECTION']

function fmtDate(d?: string | null) {
  if (!d) return '—'
  const dt = new Date(d)
  return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function CheckerAssignmentsTab({ checkerId }: { checkerId: string }) {
  const [data, setData] = useState<CheckerAssignments | null>(null)
  const [loading, setLoading] = useState(true)
  const [sub, setSub] = useState<'vendor' | 'product'>('vendor')
  const [vendorStatus, setVendorStatus] = useState('ALL')
  const [productStatus, setProductStatus] = useState('ALL')

  useEffect(() => {
    let active = true
    qcCheckerService
      .getCheckerAssignments(checkerId)
      .then((d) => { if (active) setData(d) })
      .catch(() => { if (active) setData({ vendorInspections: [], productAssignments: [] }) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [checkerId])

  const vendorInspections = data?.vendorInspections ?? []
  const productAssignments = data?.productAssignments ?? []

  const vendorFiltered = useMemo(
    () => (vendorStatus === 'ALL' ? vendorInspections : vendorInspections.filter((v) => v.status === vendorStatus)),
    [vendorInspections, vendorStatus],
  )
  const productFiltered = useMemo(
    () => (productStatus === 'ALL' ? productAssignments : productAssignments.filter((p) => p.approvalStatus === productStatus)),
    [productAssignments, productStatus],
  )

  if (loading) {
    return <div className="flex items-center justify-center py-16 text-slate-400"><Loader2 className="w-6 h-6 animate-spin" /></div>
  }

  return (
    <div className="space-y-4">
      {/* Vendor / Product sub-tabs */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => setSub('vendor')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sub === 'vendor' ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
        >
          <Store className="w-4 h-4" /> Vendor Inspections
          <span className={`ml-1 rounded-full px-1.5 text-[11px] ${sub === 'vendor' ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{vendorInspections.length}</span>
        </button>
        <button
          onClick={() => setSub('product')}
          className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${sub === 'product' ? 'bg-brand-500 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
        >
          <Package className="w-4 h-4" /> Product Assignments
          <span className={`ml-1 rounded-full px-1.5 text-[11px] ${sub === 'product' ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>{productAssignments.length}</span>
        </button>

        {/* Status filter (right-aligned) */}
        <div className="ml-auto w-52">
          {sub === 'vendor' ? (
            <Dropdown
              value={vendorStatus}
              onChange={(v) => setVendorStatus(v as string)}
              options={VENDOR_STATUSES.map((s) => ({ value: s, label: s === 'ALL' ? 'All statuses' : prettyStatus(s) }))}
            />
          ) : (
            <Dropdown
              value={productStatus}
              onChange={(v) => setProductStatus(v as string)}
              options={PRODUCT_STATUSES.map((s) => ({ value: s, label: s === 'ALL' ? 'All statuses' : prettyStatus(s) }))}
            />
          )}
        </div>
      </div>

      {/* ── Vendor inspections table ── */}
      {sub === 'vendor' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {vendorFiltered.length === 0 ? (
            <div className="text-center py-14 text-slate-500">
              <Store className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p>{vendorInspections.length === 0 ? 'No vendor inspections assigned.' : 'No inspections match this filter.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Vendor</th>
                    <th className="px-4 py-3 font-bold">PO Number</th>
                    <th className="px-4 py-3 font-bold">Type</th>
                    <th className="px-4 py-3 font-bold">Scheduled</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                    <th className="px-4 py-3 font-bold">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {vendorFiltered.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{v.vendor?.companyName || v.vendor?.ownerName || '—'}</div>
                        {(v.vendor?.factoryCity || v.vendor?.factoryState) && (
                          <div className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3 h-3" />{[v.vendor?.factoryCity, v.vendor?.factoryState].filter(Boolean).join(', ')}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 font-mono text-xs">{v.poNumber || '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
                          <Plane className="w-3 h-3" />{v.inspectionType === 'VIRTUAL' ? 'Virtual' : 'Physical'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" />{fmtDate(v.scheduledDate)}</div>
                        {v.scheduledTime && <div className="text-xs text-slate-400">{v.scheduledTime}</div>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                      <td className="px-4 py-3">
                        {v.result ? (
                          <span className={`text-xs font-semibold ${v.result === 'PASSED' ? 'text-emerald-600' : 'text-red-600'}`}>{v.result}</span>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Product assignments table ── */}
      {sub === 'product' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          {productFiltered.length === 0 ? (
            <div className="text-center py-14 text-slate-500">
              <Package className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <p>{productAssignments.length === 0 ? 'No products assigned.' : 'No products match this filter.'}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-left text-[10px] uppercase tracking-wider text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-bold">Product</th>
                    <th className="px-4 py-3 font-bold">Vendor</th>
                    <th className="px-4 py-3 font-bold">Category</th>
                    <th className="px-4 py-3 font-bold">Scheduled</th>
                    <th className="px-4 py-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {productFiltered.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-900">{p.name}</div>
                        {p.baseSku && <div className="text-xs text-slate-400 font-mono">{p.baseSku}</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{p.vendor?.companyName || p.vendor?.ownerName || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{p.category || '—'}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {p.qcAssignment?.scheduledDate ? (
                          <>
                            <div className="flex items-center gap-1"><Calendar className="w-3 h-3 text-slate-400" />{fmtDate(p.qcAssignment.scheduledDate)}</div>
                            {p.qcAssignment.scheduledTime && <div className="text-xs text-slate-400">{p.qcAssignment.scheduledTime}</div>}
                          </>
                        ) : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-4 py-3"><StatusBadge status={p.approvalStatus} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
