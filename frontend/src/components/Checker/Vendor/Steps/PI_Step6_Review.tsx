'use client'

import { CheckCircle2, XCircle, Minus, Pencil, Package, Box, Ruler, Zap, ClipboardList, Building2 } from 'lucide-react'
import type { PackagingItem, TestGroup } from './PI_data'
import { ADDITIONAL_EVIDENCE_DEFS } from './PI_data'

// ── Code badge helper ────────────────────────────────────────────────────────
const CODE_LABELS: Record<number, string> = {
  1: 'Critical Defect', 2: 'Major Defect', 3: 'Functional Fail', 4: 'Safety Issue',
  5: 'Non-Conformance', 6: 'Minor Issue', 7: 'Re-inspection',
  8: 'Acceptable', 9: 'Good', 10: 'Excellent',
}
function codeBadge(code: number) {
  if (code <= 5) return 'bg-red-100 text-red-700 border-red-200'
  if (code <= 7) return 'bg-amber-100 text-amber-700 border-amber-200'
  return 'bg-emerald-100 text-emerald-700 border-emerald-200'
}

// ── Shared sub-components ────────────────────────────────────────────────────
function SectionHeader({
  icon, title, stepLabel, onEdit,
}: {
  icon: React.ReactNode
  title: string
  stepLabel: string
  onEdit: () => void
}) {
  return (
    <div className="flex items-center gap-3 pb-3 border-b border-slate-200 mb-4">
      <span className="text-brand-500">{icon}</span>
      <h3 className="text-base font-bold text-slate-800 flex-1">{title}</h3>
      <span className="text-xs text-slate-400">{stepLabel}</span>
      <button
        type="button"
        onClick={onEdit}
        className="flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 px-3 py-1.5 rounded-lg border border-brand-100 transition-colors"
      >
        <Pencil className="w-3 h-3" /> Edit
      </button>
    </div>
  )
}

function ReviewRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between items-start py-2 border-b border-slate-100 last:border-0 gap-4">
      <span className="text-sm text-slate-500 font-medium shrink-0">{label}</span>
      <span className="text-sm text-slate-900 font-semibold text-right">{value || '—'}</span>
    </div>
  )
}

function VerificationBadge({ ok }: { ok: boolean | null }) {
  if (ok === true) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
      <CheckCircle2 className="w-3 h-3" /> Yes
    </span>
  )
  if (ok === false) return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-red-700 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> No
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs font-bold text-slate-500 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded-full">
      <Minus className="w-3 h-3" /> —
    </span>
  )
}

// ── Props ────────────────────────────────────────────────────────────────────
interface Props {
  formData: {
    serviceStartDate: string
    serviceType: string
    vendorData: any
    productData: any
    productVerifications: Record<string, { ok: boolean | null; remarks: string }>
    productEvidencePhotos: any[]
    packagingItems: PackagingItem[]
    packagingPhotos: any[]
    inspectionLevel: string
    sampleSize: number
    aqlCritical: number
    aqlMajor: number
    aqlMinor: number
    criticalDefects: number
    majorDefects: number
    minorDefects: number
    criticalDefectDetails: string
    majorDefectDetails: string
    minorDefectDetails: string
    testGroups: TestGroup[]
    additionalEvidence: Record<string, any[]>
    finalDecision: string
    reviewerRemarks: string
  }
  onEditStep: (stepId: string) => void
}

export default function PI_Step6_Review({ formData: d, onEditStep }: Props) {
  const v = d.vendorData || {}
  const p = d.productData || {}

  const verEntries = Object.entries(d.productVerifications || {})
  const verYes = verEntries.filter(([, v]) => v.ok === true).length
  const verNo = verEntries.filter(([, v]) => v.ok === false).length
  const verTotal = verEntries.length

  const allTests = (d.testGroups || []).flatMap((g) => g.tests)
  const testPass = allTests.filter((t) => t.pass).length
  const testFail = allTests.filter((t) => t.fail).length
  const testDone = testPass + testFail

  const pkgItems: PackagingItem[] = d.packagingItems || []
  const pkgInspected = pkgItems.filter((i) => i.verified === true).length

  return (
    <div className="space-y-10">
      <div className="border-b border-slate-200 pb-6">
        <h2 className="text-2xl font-bold text-slate-900 mb-1">Inspection Review</h2>
        <p className="text-slate-500 text-sm">
          Full summary of all steps. Click Edit on any section to go back and make changes.
        </p>
      </div>

      {/* ── Top-level summary cards ──────────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-700">{verYes}</p>
          <p className="text-xs font-semibold text-emerald-700 mt-0.5">Fields Verified</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-red-700">{verNo}</p>
          <p className="text-xs font-semibold text-red-700 mt-0.5">Fields Issues</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-emerald-700">{testPass}</p>
          <p className="text-xs font-semibold text-emerald-700 mt-0.5">Tests Passed</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <p className="text-2xl font-extrabold text-red-700">{testFail}</p>
          <p className="text-xs font-semibold text-red-700 mt-0.5">Tests Failed</p>
        </div>
      </div>

      {/* ── Step 1: General Information ──────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<Building2 className="w-4 h-4" />}
          title="General Information"
          stepLabel="Step 1"
          onEdit={() => onEditStep('generalInformation')}
        />
        <div className="space-y-1">
          <ReviewRow label="Company" value={v.companyName} />
          <ReviewRow label="Business Type" value={v.businessType} />
          <ReviewRow label="Product" value={p.name} />
          <ReviewRow label="Inspection Date" value={d.serviceStartDate} />
          <ReviewRow label="Service Type" value={d.serviceType} />
        </div>
      </div>

      {/* ── Step 2: Product Verification ─────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<Box className="w-4 h-4" />}
          title="Product Verification"
          stepLabel="Step 2"
          onEdit={() => onEditStep('productVerification')}
        />
        {verTotal === 0 ? (
          <p className="text-sm text-slate-400 italic">No fields verified.</p>
        ) : (
          <div className="space-y-2">
            {/* Summary bar */}
            <div className="flex items-center gap-3 text-sm mb-2">
              <span className="text-slate-600">{verDone(verYes, verNo, verTotal)}</span>
              <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-emerald-500 rounded-full"
                  style={{ width: `${verTotal ? (verYes / verTotal) * 100 : 0}%` }}
                />
              </div>
            </div>
            {/* Fields with issues */}
            {verNo > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-bold text-red-700 uppercase tracking-wide">Fields with Issues</p>
                {Object.entries(d.productVerifications || {})
                  .filter(([, val]) => val.ok === false)
                  .map(([key, val]) => (
                    <div key={key} className="bg-red-50 border border-red-100 rounded-lg px-3 py-2 flex items-start gap-2">
                      <XCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-700">{key.replace(/^pv_/, '').replace(/_/g, ' ')}</p>
                        {val.remarks && <p className="text-xs text-red-700 italic">{val.remarks}</p>}
                      </div>
                    </div>
                  ))
                }
              </div>
            )}
            <ReviewRow label="Photo Evidence" value={`${(d.productEvidencePhotos || []).length} photo(s)`} />
          </div>
        )}
      </div>

      {/* ── Step 3: Packaging Inspection ─────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<Package className="w-4 h-4" />}
          title="Packaging Inspection"
          stepLabel="Step 3"
          onEdit={() => onEditStep('packagingInspection')}
        />
        <div className="space-y-2">
          {pkgItems.map((item) => (
            <div key={item.id} className="border border-slate-100 rounded-xl px-4 py-3 flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800 truncate">{item.label}</p>
                {item.verified === true && item.remarkCode !== null && (
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-semibold ${codeBadge(item.remarkCode)}`}>
                      Code {item.remarkCode} — {CODE_LABELS[item.remarkCode]}
                    </span>
                  </div>
                )}
                {item.remarks && (
                  <p className="text-xs text-slate-500 italic mt-1">{item.remarks}</p>
                )}
              </div>
              <VerificationBadge ok={item.verified} />
            </div>
          ))}
          <ReviewRow label="Packaging Photos" value={`${(d.packagingPhotos || []).length} photo(s)`} />
        </div>
      </div>

      {/* ── Step 4: Defects ──────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<ClipboardList className="w-4 h-4" />}
          title="Defects"
          stepLabel="Step 4"
          onEdit={() => onEditStep('defects')}
        />
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div className="border border-red-200 bg-red-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-red-700">{d.criticalDefects}</p>
            <p className="text-xs text-red-600 font-semibold">Critical</p>
          </div>
          <div className="border border-amber-200 bg-amber-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-amber-700">{d.majorDefects}</p>
            <p className="text-xs text-amber-600 font-semibold">Major</p>
          </div>
          <div className="border border-slate-200 bg-slate-50 rounded-xl p-3 text-center">
            <p className="text-xl font-bold text-slate-700">{d.minorDefects}</p>
            <p className="text-xs text-slate-600 font-semibold">Minor</p>
          </div>
        </div>
        <div className="space-y-1">
          <ReviewRow label="Inspection Level" value={d.inspectionLevel} />
          <ReviewRow label="Sample Size" value={d.sampleSize} />
        </div>
      </div>

      {/* ── Step 5: Testing ───────────────────────────────────────────────── */}
      <div>
        <SectionHeader
          icon={<Zap className="w-4 h-4" />}
          title="Testing"
          stepLabel="Step 5"
          onEdit={() => onEditStep('testing')}
        />
        <div className="space-y-3">
          {(d.testGroups || []).map((group) => {
            const gPass = group.tests.filter((t) => t.pass).length
            const gFail = group.tests.filter((t) => t.fail).length
            const gTotal = group.tests.length
            return (
              <div key={group.id} className="border border-slate-200 rounded-xl px-4 py-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-800">{group.label}</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-700 font-semibold">{gPass}✓</span>
                    <span className="text-red-700 font-semibold">{gFail}✗</span>
                    <span className="text-slate-400">{gPass + gFail}/{gTotal}</span>
                  </div>
                </div>
                {/* Failed tests */}
                {group.tests.filter((t) => t.fail).map((t) => (
                  <div key={t.id} className="text-xs text-red-700 flex items-center gap-1 mt-1">
                    <XCircle className="w-3 h-3" /> {t.label}
                    {t.remarks && <span className="text-slate-500 italic"> — {t.remarks}</span>}
                  </div>
                ))}
              </div>
            )
          })}

          {/* Additional evidence counts */}
          <div className="border border-slate-100 rounded-xl px-4 py-3">
            <p className="text-sm font-bold text-slate-700 mb-2">Additional Evidence</p>
            <div className="grid grid-cols-2 gap-2">
              {ADDITIONAL_EVIDENCE_DEFS.map((def) => (
                <ReviewRow
                  key={def.id}
                  label={def.label.split('(')[0].trim()}
                  value={`${((d.additionalEvidence || {})[def.id] || []).length} photo(s)`}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Final Decision ────────────────────────────────────────────────── */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        <div className="bg-slate-50 border-b border-slate-200 px-5 py-3 flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-brand-500" />
          <h3 className="text-sm font-bold text-slate-800">Final Decision</h3>
        </div>
        <div className="p-5 space-y-2">
          <ReviewRow label="Decision" value={
            <span className={`font-bold px-3 py-1 rounded-full text-xs border ${
              d.finalDecision === 'Approved'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-red-50 text-red-700 border-red-200'
            }`}>
              {d.finalDecision}
            </span>
          } />
          {d.reviewerRemarks && (
            <ReviewRow label="Remarks" value={d.reviewerRemarks} />
          )}
        </div>
      </div>
    </div>
  )
}

function verDone(yes: number, no: number, total: number) {
  const done = yes + no
  return `${done} / ${total} fields reviewed (${yes} verified, ${no} issues)`
}
