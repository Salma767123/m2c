'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Check, ArrowLeft, ArrowRight, AlertTriangle, ShieldAlert, Clock, Save, AlarmClockOff } from 'lucide-react'
import { HighlightFieldsProvider } from './Steps/VI_VerifyField'
import type { Verifications } from './Steps/VI_VerifyField'
import type { InspectorMeta } from './Steps/VI_Step8_FinalReview'
import VI_Step1_CompanyInfo from './Steps/VI_Step1_CompanyInfo'
import VI_Step2_WarehouseFactory, { detectSameAsWarehouse } from './Steps/VI_Step2_WarehouseFactory'
import type { FactoryEvidenceState } from './Steps/VI_Step2_WarehouseFactory'
import VI_Step3_OwnerProfile from './Steps/VI_Step3_OwnerProfile'
import VI_Step4_VendorType from './Steps/VI_Step4_VendorType'
import VI_Step5_Manufacturing from './Steps/VI_Step5_Manufacturing'
import VI_Step6_Certifications from './Steps/VI_Step6_Certifications'
import VI_Step7_ContactTrade from './Steps/VI_Step7_ContactTrade'
import VI_Step8_FinalReview from './Steps/VI_Step8_FinalReview'
import VendorDocumentation from './VendorDocumentation'
import type { VendorDocData } from './VendorDocumentation'

import qcCheckerService from '@/services/qcCheckerService'
import { formatCheckerName } from '@/lib/checkerUtils'
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils'

interface Props {
  vendorId: string
  vendorName: string
  onComplete: () => void
}

const STEPS = [
  { id: 1, label: 'Company Info',    short: '1' },
  { id: 2, label: 'Warehouse',       short: '2' },
  { id: 3, label: 'Owner',           short: '3' },
  { id: 4, label: 'Vendor & Products', short: '4' },
  { id: 5, label: 'Manufacturing',   short: '5' },
  { id: 6, label: 'Certifications',  short: '6' },
  { id: 7, label: 'Contact & Trade', short: '7' },
  { id: 8, label: 'Final Review',    short: '8' },
  { id: 9, label: 'Documentation',   short: '9' },
]

// Geofencing is disabled everywhere by default — dev AND production — so
// inspections never require GPS or the browser location prompt. Set
// NEXT_PUBLIC_ENABLE_GEOFENCE=true to turn it back on. The backend applies the
// same rule (see utils/locationUtils.isGeofenceDisabled).
const GEOFENCE_DISABLED = process.env.NEXT_PUBLIC_ENABLE_GEOFENCE !== 'true'

function getCurrentCoords(): Promise<{ checkerLatitude: number; checkerLongitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      reject(new Error('Location is not supported by this browser. Please use a device with GPS/location enabled.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ checkerLatitude: pos.coords.latitude, checkerLongitude: pos.coords.longitude }),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? 'Location permission was denied. Please allow location access for this site and refresh the page to start the inspection.'
            : err.code === err.POSITION_UNAVAILABLE
              ? 'Your location could not be determined. Please check that location services are enabled and try again.'
              : 'Timed out while getting your location. Please try again.'
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

export default function VendorInspectionForm({ vendorId, vendorName, onComplete }: Props) {
  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<{ type: 'not_assigned' | 'submitted' | 'unknown' | 'expired'; message: string } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [checkerCoords, setCheckerCoords] = useState<{ checkerLatitude: number; checkerLongitude: number } | null>(null)
  const [vendor, setVendor] = useState<any>(null)
  const [inspection, setInspection] = useState<any>(null)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [previousRejectionReason, setPreviousRejectionReason] = useState<string | null>(null)
  const [verifications, setVerifications] = useState<Verifications>({})
  const [meta, setMeta] = useState<InspectorMeta>({
    inspectorName: '',
    inspectionDate: new Date().toLocaleDateString('en-CA'), // local date, not UTC (F-09)
    overallResult: '',
    inspectorRemarks: '',
  })
  const [finalReviewErrors, setFinalReviewErrors] = useState<{ overallResult?: boolean; inspectorRemarks?: boolean }>({})
  const [factoryEvidence, setFactoryEvidence] = useState<FactoryEvidenceState>({
    frontView: null,
    nameBoard: null,
    routeMap: null,
    warehouseFrontView: null,
    warehouseNameBoard: null,
    warehouseRouteMap: null,
  })
  const [evidenceError, setEvidenceError] = useState(false)
  const [docData, setDocData] = useState<VendorDocData>({
    signedDocuments: [],
    signedReport: [],
    clientSignature: '',
  })

  // ── Registered fields for mandatory validation ─────────────────────────────
  const registeredFieldsRef = useRef<string[]>([])
  const [highlightedKeys, setHighlightedKeys] = useState<Set<string>>(new Set())
  const pendingScrollRef = useRef<string | null>(null)
  // Client-side fallback for the report's "Inspection Start Time": the backend
  // only stamps inspection.startedAt on the SCHEDULED→IN_PROGRESS transition, so
  // it can be null. Capture when the checker opened this form so the time always
  // shows on the generated report.
  const formOpenedAtRef = useRef<string>(new Date().toISOString())

  const handleRegisterFields = useCallback((keys: string[]) => {
    registeredFieldsRef.current = keys
    setVerifications(prev => {
      const next = { ...prev }
      let changed = false
      for (const k of keys) {
        if (!(k in next)) { next[k] = { ok: null, remarks: '' }; changed = true }
      }
      return changed ? next : prev
    })
  }, [])

  // ── Exit confirmation guard ────────────────────────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false)
  const pendingNavRef = useRef<null | (() => void)>(null)
  const allowLeaveRef = useRef(false)
  const rootRef = useRef<HTMLDivElement>(null)

  const requestExit = (action: () => void) => {
    if (allowLeaveRef.current) { action(); return }
    pendingNavRef.current = action
    setShowExitConfirm(true)
  }

  const confirmExit = () => {
    setShowExitConfirm(false)
    allowLeaveRef.current = true
    const action = pendingNavRef.current
    pendingNavRef.current = null
    action?.()
  }

  const cancelExit = () => {
    setShowExitConfirm(false)
    pendingNavRef.current = null
  }

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (allowLeaveRef.current) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  useEffect(() => {
    window.history.pushState(null, '', window.location.href)
    const onPop = () => {
      if (allowLeaveRef.current) return
      window.history.pushState(null, '', window.location.href)
      requestExit(() => { allowLeaveRef.current = true; window.history.back() })
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  useEffect(() => {
    const onClickCapture = (e: MouseEvent) => {
      if (allowLeaveRef.current) return
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const anchor = (e.target as HTMLElement | null)?.closest('a') as HTMLAnchorElement | null
      if (!anchor) return
      if (rootRef.current && rootRef.current.contains(anchor)) return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('blob:') || anchor.target === '_blank' || anchor.hasAttribute('download')) return
      e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation()
      requestExit(() => { allowLeaveRef.current = true; window.location.href = href })
    }
    document.addEventListener('click', onClickCapture, true)
    return () => document.removeEventListener('click', onClickCapture, true)
  }, [])

  // ── Data loading ───────────────────────────────────────────────────────────
  const prefilledRef = useRef(false)

  useEffect(() => {
    if (prefilledRef.current) return
    let cancelled = false

    async function autoStart(inspId: string) {
      try {
        // Dev/non-production: start without GPS so the browser never prompts.
        if (GEOFENCE_DISABLED) {
          const res = await qcCheckerService.startInspection(inspId, { checkerLatitude: null, checkerLongitude: null } as any)
          if (res?.inspection && !cancelled) setInspection(res.inspection)
          return
        }
        const coords = await getCurrentCoords()
        if (cancelled) return
        setCheckerCoords(coords)
        const res = await qcCheckerService.startInspection(inspId, coords)
        if (res?.inspection && !cancelled) setInspection(res.inspection)
      } catch (err: any) {
        if (cancelled) return
        const msg: string = err?.message || ''
        // Booked window elapsed before the checker started — block the form with
        // a full-page warning; the assignment is now EXPIRED and needs a reassign.
        if (err?.code === 'INSPECTION_EXPIRED' || (err?.status === 409 && /window has passed|expired/i.test(msg))) {
          setLoadError({ type: 'expired', message: msg || 'This inspection can no longer be started — its scheduled time window has passed. Please ask the admin to schedule a new assignment.' })
          return
        }
        if (err?.status === 400 && /already/i.test(msg)) return
        // Vendor has no map location configured — geofence can't run, but the
        // inspection form should still be usable. Don't surface this as an error.
        if (/vendor location not set/i.test(msg)) return
        console.error('Auto-start failed:', err)
        showErrorToast('Could not start inspection', msg || 'Please enable location services and refresh the page.')
      }
    }

    async function load() {
      try {
        const cached = qcCheckerService.getCheckerData?.()
        if (cached?.name && !cancelled) {
          setMeta(prev => ({ ...prev, inspectorName: prev.inspectorName || formatCheckerName(cached) }))
        }

        const [vendorRes, inspRes] = await Promise.all([
          qcCheckerService.getVendorDetails(vendorId),
          qcCheckerService.getActiveInspectionForVendor(vendorId),
        ])
        if (cancelled) return

        if (vendorRes.success) {
          setVendor(vendorRes.data.vendor)
          // Overwrite inspectorName with the current name from DB (picks up admin edits)
          const liveQc = vendorRes.data.vendor?.assignedQc
          if (liveQc) {
            setMeta(prev => ({ ...prev, inspectorName: formatCheckerName(liveQc) }))
          }
        }

        let insp = inspRes?.inspection

        if (!insp) {
          try {
            const beginRes = await qcCheckerService.beginVendorInspection(vendorId)
            if (cancelled) return
            insp = beginRes.inspection
          } catch (beginErr: any) {
            if (cancelled) return
            const status = beginErr?.status
            const code = beginErr?.data?.code
            const msg: string = beginErr?.data?.message || beginErr?.message || 'Could not begin inspection.'
            if (code === 'INSPECTION_EXPIRED' || (status === 409 && /window has passed|expired/i.test(msg))) {
              setLoadError({ type: 'expired', message: msg })
            } else if (status === 403) {
              setLoadError({ type: 'not_assigned', message: msg })
            } else if (status === 409) {
              setLoadError({ type: 'submitted', message: msg })
            } else {
              setLoadError({ type: 'unknown', message: msg })
            }
            return
          }
        }

        if (insp && !cancelled) {
          setInspection(insp)
          if (insp.cycleNumber > 1) setCycleNumber(insp.cycleNumber)
          if (inspRes?.previousRejectionReason) setPreviousRejectionReason(inspRes.previousRejectionReason)
          else if (insp.rejectionReason) setPreviousRejectionReason(insp.rejectionReason)

          if (insp.status === 'SCHEDULED') {
            autoStart(insp.id)
          }
        }

        prefilledRef.current = true
      } catch (err: any) {
        if (cancelled) return
        const status = err?.status
        const msg: string = err?.message || 'Failed to load inspection data.'
        if (status === 403) {
          setLoadError({ type: 'not_assigned', message: msg })
        } else {
          setLoadError({ type: 'unknown', message: msg })
        }
        console.error('Failed to load inspection data', err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => { cancelled = true }
  }, [vendorId])

  // ── Verification state handler ─────────────────────────────────────────────
  const handleVerificationChange = (key: string, ok: boolean | null, remarks: string) => {
    setVerifications(prev => ({ ...prev, [key]: { ok, remarks } }))
  }

  // ── Navigation ─────────────────────────────────────────────────────────────
  const goNext = () => {
    if (step === 2) {
      // Legal Address & Factory Site evidence is always mandatory — Name Board,
      // Front View AND Route Map.
      const hasFactoryEvidence = factoryEvidence.frontView && factoryEvidence.nameBoard && factoryEvidence.routeMap
      // Warehouse evidence is only required when the warehouse address differs
      // from the Legal Address & Factory Site (matches the extra upload group).
      const isSameWarehouse = detectSameAsWarehouse(vendor || {})
      const hasWarehouseEvidence = isSameWarehouse
        || (factoryEvidence.warehouseFrontView && factoryEvidence.warehouseNameBoard && factoryEvidence.warehouseRouteMap)
      if (!hasFactoryEvidence || !hasWarehouseEvidence) {
        setEvidenceError(true)
        document.getElementById('inspector-evidence-photos')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        showErrorToast(
          'Evidence photos required',
          isSameWarehouse
            ? 'Please upload all three Legal Address & Factory Site evidence photos (Name Board, Front View, Route Map) before continuing.'
            : 'Please upload all six inspector evidence photos — Legal Address & Factory Site and Warehouse (Name Board, Front View, Route Map each) — before continuing.'
        )
        return
      }
      setEvidenceError(false)
    }

    if (step === 8) {
      // Final Review: overall result and overall remarks are both mandatory
      // before advancing to the Documentation step.
      if (!meta.overallResult) {
        setFinalReviewErrors(prev => ({ ...prev, overallResult: true }))
        document.getElementById('overall-inspection-result')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        showErrorToast('Overall result required', 'Please select an overall inspection result before continuing.')
        return
      }
      if (!meta.inspectorRemarks.trim()) {
        setFinalReviewErrors(prev => ({ ...prev, inspectorRemarks: true }))
        document.getElementById('inspector-overall-remarks')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        showErrorToast('Overall remarks required', 'Please enter your overall inspector remarks before continuing.')
        return
      }
    }

    if (step >= 1 && step <= 8) {
      const keys = registeredFieldsRef.current
      if (keys.length > 0) {
        // A field is incomplete if it hasn't been verified yet, OR it was
        // marked "No" without a reason — a reason is mandatory for every "No".
        const incomplete = keys.filter(k => {
          const fv = verifications[k]
          const ok = fv?.ok ?? null
          if (ok === null) return true
          if (ok === false && !fv?.remarks?.trim()) return true
          return false
        })
        if (incomplete.length > 0) {
          setHighlightedKeys(new Set(incomplete))
          const el = document.getElementById(`vf-${incomplete[0]}`)
          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          showErrorToast(
            'Verification incomplete',
            `${incomplete.length} field${incomplete.length !== 1 ? 's' : ''} need attention. Verify every field and add a reason for any marked "No".`
          )
          return
        }
      }
    }
    setHighlightedKeys(new Set())
    if (step < STEPS.length) {
      setStep(s => s + 1)
    }
  }

  const goPrev = () => {
    if (step > 1) {
      setStep(s => s - 1)
    }
  }

  const goToStep = (target: number) => { if (target !== step) setStep(target) }

  const handleGoToStep = (targetStep: number, fieldKey?: string) => {
    setStep(targetStep)
    if (fieldKey) {
      setHighlightedKeys(new Set([fieldKey]))
      pendingScrollRef.current = fieldKey
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Scroll the layout's overflow container to the top on every step change.
  // window.scrollTo doesn't work here because the checker layout uses
  // <main className="overflow-y-auto"> as the scroll container, not the window.
  useEffect(() => {
    if (!pendingScrollRef.current) {
      document.querySelector('main')?.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }, [step])

  useEffect(() => {
    const key = pendingScrollRef.current
    if (!key) return
    const timeout = setTimeout(() => {
      const el = document.getElementById(`vf-${key}`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      pendingScrollRef.current = null
    }, 120)
    return () => clearTimeout(timeout)
  }, [step])

  // ── Submission ─────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!inspection?.id) {
      showErrorToast('Cannot Submit', 'No active inspection found. Please contact your administrator.')
      return
    }
    if (!meta.inspectorName.trim()) {
      setStep(8)
      showErrorToast('Inspector name required', 'Please enter the inspector name before submitting.')
      return
    }
    if (!meta.overallResult) {
      setStep(8)
      showErrorToast('Overall result required', 'Please select an overall result before submitting.')
      return
    }
    if (!meta.inspectorRemarks.trim()) {
      setStep(8)
      showErrorToast('Overall remarks required', 'Please enter your overall inspector remarks before submitting.')
      return
    }

    const hasSignOff = docData.signedDocuments.length > 0 || docData.signedReport.length > 0
    if (!hasSignOff) {
      setStep(9)
      showErrorToast('Sign-off Required', 'Please upload a manually signed document or generate a digitally signed report before submitting the inspection.')
      return
    }

    setSubmitting(true)

    // Use GPS captured at inspection start; re-fetch only if not available.
    // Skipped entirely outside production — no location prompt, no requirement.
    let coords = checkerCoords
    if (!coords && !GEOFENCE_DISABLED) {
      try {
        coords = await getCurrentCoords()
        setCheckerCoords(coords)
      } catch (gpsErr: any) {
        showErrorToast('Location Required', gpsErr?.message || 'Please enable location services and try again.')
        setSubmitting(false)
        return
      }
    }

    try {
      // Inspector evidence photos captured in Step 2. Sent as base64 data URLs;
      // the backend uploads each to Cloudinary and stores the hosted URL under
      // itemsToInspect.inspectorEvidenceImages, so admin/QC reports can show them.
      const inspectorEvidenceImages = [
        factoryEvidence.nameBoard && { label: 'Factory Site Name Board', dataUrl: factoryEvidence.nameBoard.url },
        factoryEvidence.frontView && { label: 'Factory Site Front View', dataUrl: factoryEvidence.frontView.url },
        factoryEvidence.routeMap && { label: 'Factory Site Route Map', dataUrl: factoryEvidence.routeMap.url },
        factoryEvidence.warehouseNameBoard && { label: 'Warehouse Name Board', dataUrl: factoryEvidence.warehouseNameBoard.url },
        factoryEvidence.warehouseFrontView && { label: 'Warehouse Front View', dataUrl: factoryEvidence.warehouseFrontView.url },
        factoryEvidence.warehouseRouteMap && { label: 'Warehouse Route Map', dataUrl: factoryEvidence.warehouseRouteMap.url },
      ].filter(Boolean)

      const payload = {
        verifications,
        inspectorName: meta.inspectorName,
        inspectionDate: meta.inspectionDate,
        inspectionStatus: meta.overallResult,
        inspectorRemarks: meta.inspectorRemarks,
        cycleNumber,
        checkerLatitude: coords?.checkerLatitude ?? null,
        checkerLongitude: coords?.checkerLongitude ?? null,
        clientSignature: docData.clientSignature || null,
        inspectorEvidenceImages: inspectorEvidenceImages.length > 0 ? inspectorEvidenceImages : null,
      }
      const res = await qcCheckerService.completeInspection(inspection.id, payload)
      if (res.success) {
        allowLeaveRef.current = true
        setInspection(null)
        showSuccessToast('Inspection Submitted! ✅', 'Vendor inspection report has been submitted successfully.')
        setTimeout(() => onComplete(), 1500)
      } else {
        showErrorToast('Submission Failed', 'Could not submit the inspection. Please try again.')
      }
    } catch (err: any) {
      console.error('Error submitting inspection:', err)
      showErrorToast('Submission Error', err?.message || 'An unexpected error occurred.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Render step content ────────────────────────────────────────────────────
  const commonProps = {
    vendor: vendor ?? {},
    verifications,
    onChange: handleVerificationChange,
    onRegisterFields: handleRegisterFields,
  }

  function renderStep() {
    if (!vendor && step < 9) return null
    switch (step) {
      case 1: return <VI_Step1_CompanyInfo {...commonProps} />
      case 2: return (
        <VI_Step2_WarehouseFactory
          {...commonProps}
          factoryEvidence={factoryEvidence}
          onEvidenceChange={(slot, photo) => { setFactoryEvidence(prev => ({ ...prev, [slot]: photo })); setEvidenceError(false) }}
          evidenceError={evidenceError}
        />
      )
      case 3: return <VI_Step3_OwnerProfile {...commonProps} />
      case 4: return <VI_Step4_VendorType {...commonProps} />
      case 5: return <VI_Step5_Manufacturing {...commonProps} />
      case 6: return <VI_Step6_Certifications {...commonProps} />
      case 7: return <VI_Step7_ContactTrade {...commonProps} />
      case 8: return (
        <VI_Step8_FinalReview
          vendor={vendor ?? {}}
          inspection={inspection}
          verifications={verifications}
          meta={meta}
          onMetaChange={(patch) => {
            setMeta(prev => ({ ...prev, ...patch }))
            if ('overallResult' in patch) setFinalReviewErrors(prev => ({ ...prev, overallResult: false }))
            if ('inspectorRemarks' in patch) setFinalReviewErrors(prev => ({ ...prev, inspectorRemarks: false }))
          }}
          fieldErrors={finalReviewErrors}
          onGoToStep={handleGoToStep}
        />
      )
      case 9: return (
        <VendorDocumentation
          vendor={vendor ?? {}}
          verifications={verifications}
          meta={meta}
          docData={docData}
          onDocDataChange={(patch) => setDocData(prev => ({ ...prev, ...patch }))}
          factoryEvidence={factoryEvidence}
          inspectionStartedAt={inspection?.startedAt ?? formOpenedAtRef.current}
        />
      )
      default: return null
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-slate-600 font-semibold">Loading vendor inspection…</p>
        </div>
      </div>
    )
  }

  if (loadError) {
    const isSubmitted = loadError.type === 'submitted'
    const isNotAssigned = loadError.type === 'not_assigned'
    const isExpired = loadError.type === 'expired'
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f7f5]">
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-5">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mx-auto ${
            isSubmitted || isExpired ? 'bg-amber-50' : 'bg-red-50'
          }`}>
            {isSubmitted
              ? <Clock className="w-7 h-7 text-amber-500" />
              : isExpired
                ? <AlarmClockOff className="w-7 h-7 text-amber-500" />
                : <ShieldAlert className="w-7 h-7 text-red-500" />
            }
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-1">
              {isSubmitted ? 'Inspection Submitted' : isNotAssigned ? 'Access Denied' : isExpired ? 'Inspection Window Expired' : 'Unable to Start Inspection'}
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">{loadError.message}</p>
            {isExpired && (
              <p className="text-slate-500 text-xs leading-relaxed mt-2">
                The admin has been notified and can assign a new inspection for this vendor.
              </p>
            )}
          </div>
          <button
            onClick={onComplete}
            className="w-full px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors"
          >
            Back to Vendor List
          </button>
        </div>
      </div>
    )
  }

  return (
    <div ref={rootRef} className="min-h-screen font-sans bg-[#f7f7f5]">
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center gap-4">
          <button
            onClick={() => requestExit(onComplete)}
            className="p-2 hover:bg-white rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div>
            <h1 className="text-4xl font-bold text-slate-900">Vendor Inspection</h1>
            <p className="text-slate-600 text-lg">{vendorName}</p>
          </div>
        </div>

        {/* Re-inspection banner */}
        {cycleNumber > 1 && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2 mb-1">
              <span className="bg-amber-200 text-amber-900 text-xs font-bold px-2 py-0.5 rounded">Re-Inspection #{cycleNumber}</span>
            </div>
            <p className="text-sm text-amber-800">Previous inspection was rejected. Please re-evaluate thoroughly.</p>
            {previousRejectionReason && (
              <p className="text-sm text-amber-700 mt-1">
                <span className="font-medium">Previous reason:</span> {previousRejectionReason}
              </p>
            )}
          </div>
        )}

        {/* Step indicator */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-6 mb-8 overflow-x-auto">
          <div className="relative mb-8 min-w-[800px]">
            <div className="flex items-center justify-between">
              {STEPS.map((s, idx) => {
                const done = idx + 1 < step
                const active = idx + 1 === step
                return (
                  <div key={s.id} className="flex flex-col items-center relative z-10 flex-1">
                    <div
                      className={`w-11 h-11 rounded-full flex items-center justify-center font-bold transition-all duration-300 cursor-pointer text-sm border-2 ${
                        done
                          ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/10'
                          : active
                            ? 'bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/10 ring-4 ring-brand-100'
                            : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                      }`}
                      onClick={() => goToStep(s.id)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); goToStep(s.id) } }}
                      role="button"
                      tabIndex={0}
                      aria-current={active ? 'step' : undefined}
                      aria-label={`Go to ${s.label}`}
                    >
                      {done ? <Check className="w-4 h-4" /> : s.id}
                    </div>
                    <div className="mt-2.5 text-center max-w-20">
                      <p className={`text-xs font-medium leading-tight ${active ? 'text-slate-900 font-bold' : done ? 'text-slate-700' : 'text-slate-400'}`}>
                        {s.label}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
            {/* Progress line */}
            <div className="absolute top-[22px] left-6 right-6 h-0.5 bg-slate-200 z-0">
              <div
                className="h-full bg-brand-500 transition-all duration-500 ease-out"
                style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
              />
            </div>
          </div>

          {/* Current step info */}
          <div className="text-center bg-slate-50 rounded-xl p-5">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
              <p className="text-slate-600 text-sm font-medium">Step {step} of {STEPS.length}</p>
              <div className="w-1.5 h-1.5 bg-brand-500 rounded-full" />
            </div>
            <h3 className="text-slate-900 font-bold text-lg">{STEPS[step - 1].label}</h3>
          </div>
        </div>

        {/* Step content */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8">
          <HighlightFieldsProvider keys={highlightedKeys}>
            {renderStep()}
          </HighlightFieldsProvider>
        </div>

        {/* Navigation */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={goPrev}
            disabled={step === 1}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
              step === 1
                ? 'border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed'
                : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {step === STEPS.length ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || !(docData.signedDocuments.length > 0 || docData.signedReport.length > 0)}
              title={!(docData.signedDocuments.length > 0 || docData.signedReport.length > 0) ? 'Upload a signed document or generate a digitally signed report first' : undefined}
              className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors duration-200 shadow-sm shadow-emerald-600/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${submitting || !(docData.signedDocuments.length > 0 || docData.signedReport.length > 0) ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Check className="w-5 h-5" />
              {submitting ? 'Submitting…' : 'Submit Inspection Report'}
            </button>
          ) : (
            <button
              onClick={goNext}
              className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-colors duration-200 shadow-sm shadow-brand-500/10 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
            >
              <Save className="w-4 h-4" />
              Save & Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Exit confirmation modal */}
      {showExitConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="exit-confirm-title"
          onClick={cancelExit}
        >
          <div
            className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-brand-50 flex items-center justify-center">
                  <AlertTriangle className="w-6 h-6 text-brand-500" />
                </div>
                <div className="flex-1">
                  <h3 id="exit-confirm-title" className="text-lg font-bold text-slate-900">Exit inspection?</h3>
                  <p className="mt-1 text-sm text-slate-600">
                    Are you sure you want to exit? Your verification progress on this form will be lost and won&apos;t be saved.
                  </p>
                </div>
              </div>
            </div>
            <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
              <button
                onClick={cancelExit}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
              >
                Keep editing
              </button>
              <button
                onClick={confirmExit}
                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm shadow-brand-500/10"
              >
                Yes, exit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
