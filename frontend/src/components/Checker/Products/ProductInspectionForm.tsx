"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ArrowLeft, ArrowRight, AlertTriangle, RotateCcw, AlarmClockOff } from "lucide-react"

// ── Step components ───────────────────────────────────────────────────────────
import PI_Step1_GeneralInfo from "@/components/Checker/Vendor/Steps/PI_Step1_GeneralInfo"
import PI_Step2_ProductVerification from "@/components/Checker/Vendor/Steps/PI_Step2_ProductVerification"
import PI_Step3_PackagingInspection from "@/components/Checker/Vendor/Steps/PI_Step3_PackagingInspection"
import Defects from "@/components/Checker/Vendor/Steps/Defects"
import PI_Step5_Testing from "@/components/Checker/Vendor/Steps/PI_Step5_Testing"
import PI_Step6_Review from "@/components/Checker/Vendor/Steps/PI_Step6_Review"
import Documentation from "@/components/Checker/Vendor/Steps/Documentation"

// ── Shared data / default builders ───────────────────────────────────────────
import {
    makeDefaultPackagingItems,
    makeDefaultTestGroups,
    makeDefaultAdditionalEvidence,
} from "@/components/Checker/Vendor/Steps/PI_data"

// ── Services + utilities ──────────────────────────────────────────────────────
import { qcCheckerService } from "@/services/qcCheckerService"
import { formatCheckerName } from "@/lib/checkerUtils"
import { isInspectionWindowElapsed, formatAssignmentWindow } from "@/lib/inspectionSchedule"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
import { captureCoordsForSubmit, type InspectionType } from "@/lib/checkerLocation"
import InspectionTypeDialog from "@/components/Checker/Vendor/InspectionTypeDialog"
import {
    validateStep,
    validateAll,
    hasErrors,
    countErrors,
    countAllErrors,
    type Step as ValidationStep,
    type AllErrors,
} from "@/components/Checker/Products/validation"

type Step = ValidationStep

// ── Draft persistence (F-11) ──────────────────────────────────────────────────
// Field inspections are long (39 tests + ~45 photos); a reload, crash or token
// expiry used to discard everything. We snapshot the form to localStorage so it
// can be resumed. Note: base64 photos are large and easily exceed the ~5MB
// localStorage quota — when the full save fails we fall back to a lighter draft
// that keeps all answers/text and drops the photo blobs (they must be re-added).
const draftKeyFor = (productId: string) => `m2c:pi-draft:${productId}`
// The chosen inspection type is persisted separately from the form draft so a reload
// mid-inspection doesn't re-prompt (and doesn't lose the choice).
const typeKeyFor = (productId: string) => `m2c:pi-type:${productId}`

// Deep-strip base64 data URIs (photos + drawn signatures) from a value, keeping
// structure and all text so the lighter fallback draft still restores progress.
function stripBase64Deep(v: any): any {
    if (typeof v === "string") return v.startsWith("data:") ? "" : v
    if (Array.isArray(v)) return v.map(stripBase64Deep)
    if (v && typeof v === "object") {
        const out: any = {}
        for (const k of Object.keys(v)) out[k] = stripBase64Deep(v[k])
        return out
    }
    return v
}

function loadDraft<T extends Record<string, any>>(productId: string, defaults: T): T {
    if (typeof window === "undefined" || !productId) return defaults
    try {
        const raw = window.localStorage.getItem(draftKeyFor(productId))
        if (!raw) return defaults
        const saved = JSON.parse(raw)
        // Re-fetched context (productData/vendorData) is never restored from the
        // draft — the autofill effect refreshes it from the API on mount.
        return { ...defaults, ...saved, productData: defaults.productData, vendorData: defaults.vendorData }
    } catch {
        return defaults
    }
}

// Peek the raw saved draft without merging defaults — used at init to detect a
// PAUSED draft (one the checker explicitly saved & exited), which re-prompts the
// inspection type on resume.
function peekDraft(productId: string): any | null {
    if (typeof window === "undefined" || !productId) return null
    try {
        const raw = window.localStorage.getItem(draftKeyFor(productId))
        return raw ? JSON.parse(raw) : null
    } catch {
        return null
    }
}

// The blank form. Extracted so a "discard draft & restart" can rebuild it, and
// the initial state can hydrate it from a saved draft via loadDraft().
function makeDefaultFormData(productName: string, vendorName: string) {
    return {
        // Step 1
        client: "M2C",
        vendor: vendorName,
        // Local calendar date (en-CA → YYYY-MM-DD). Using toISOString() here gave
        // the UTC date, which is the previous day for IST times before 05:30 (F-09).
        serviceStartDate: new Date().toLocaleDateString("en-CA"),
        // Timestamp when the inspection was opened — surfaces as "Inspection
        // Start Time" in the generated report (the complete time is report gen).
        inspectionStartedAt: new Date().toISOString(),
        // Draft/pause timing (client-side; persisted into qcInspectionData at submit).
        // pausedAt marks an explicit "save draft & exit"; totalPausedMs accumulates
        // paused time across resume cycles.
        pausedAt: null as string | null,
        totalPausedMs: 0,
        serviceType: "Pre-Shipment Inspection",
        vendorData: null as any,
        productData: null as any,

        // Step 2
        productVerifications: {} as Record<string, { ok: boolean | null; remarks: string }>,
        productEvidencePhotos: [] as any[],

        // Step 3
        packagingItems: makeDefaultPackagingItems(),
        packagingPhotos: [] as any[],

        // Step 4 – Defects
        inspectionLevel: "L-II",
        sampleSize: 200,
        aqlCritical: 0,
        aqlMajor: 2.5,
        aqlMinor: 4.0,
        maxAllowedCritical: 0,
        maxAllowedMajor: 10,
        maxAllowedMinor: 14,
        criticalDefects: 0,
        majorDefects: 0,
        minorDefects: 0,
        criticalDefectDetails: "",
        majorDefectDetails: "",
        minorDefectDetails: "",
        defectPhotos: [] as any[],

        // Step 5 – Testing
        testGroups: makeDefaultTestGroups(),
        additionalEvidence: makeDefaultAdditionalEvidence(),

        // Step 6 – Final Decision (within Review step)
        finalDecision: "Approved",
        reviewerRemarks: "",

        // Step 7 – Documentation
        inspectorSignature: "",
        inspectionStatus: "",
        documentationPhotos: [] as any[],
        photocopyDocuments: [] as any[],
        companyIdCards: [] as any[],
        signedDocuments: [] as any[],
        signedReport: [] as any[],
        clientSignature: "",

        // Legacy compat fields (Documentation.tsx may reference these)
        items: [
            {
                id: 1,
                itemName: productName,
                itemDescription: "Standard Product Assessment",
                totalQuantity: 0,
                inspectionQuantity: 0,
            },
        ] as any[],
        warehousePhotoEvidences: [] as any[],
        measurements: [] as any[],
        measurementPhotos: [] as any[],
        tests: [] as any[],
        testingPhotos: [] as any[],
        shipperCartonRemark: "",
        innerCartonRemark: "",
        retailPackagingRemark: "",
        productTypeRemark: "",
        aqlWorkmanshipRemark: "",
        onSiteTestsRemark: "",
    }
}

interface Props {
    productId: string
    productName: string
    vendorName: string
    onComplete: () => void
    onCancel: () => void
}

export default function ProductInspectionForm({
    productId,
    productName,
    vendorName,
    onComplete,
    onCancel,
}: Props) {
    const [currentStep, setCurrentStep] = useState<Step>("generalInformation")
    // When true, Next becomes "Save & Continue" and returns to Review
    const [reviewMode, setReviewMode] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<AllErrors>({})
    // Set when the admin-booked window has elapsed — blocks the form entirely.
    const [expiredError, setExpiredError] = useState<string | null>(null)
    // The type saved from a prior session (localStorage), and whether the saved draft
    // was explicitly PAUSED (has pausedAt) — a paused draft re-prompts the type on
    // resume; a plain reload keeps the choice silently.
    const savedType: InspectionType | null = (() => {
        try {
            const v = typeof window !== "undefined" ? window.localStorage.getItem(typeKeyFor(productId)) : null
            return v === "PHYSICAL" || v === "VIRTUAL" ? (v as InspectionType) : null
        } catch { return null }
    })()
    // A resumable draft = a saved form draft for an inspection whose type was already
    // chosen. Re-entering one ALWAYS re-asks the inspection type — same as the factory
    // inspection flow, which re-prompts on every resume. (The first-ever entry has no
    // saved type, so the dialog still shows, but as the initial choice.)
    const hasResumableDraft = !!peekDraft(productId) && !!savedType

    // Physical vs virtual — chosen in the mandatory dialog before the form is usable.
    // Null forces the dialog: on a resume we deliberately re-ask.
    const [inspectionType, setInspectionType] = useState<InspectionType | null>(hasResumableDraft ? null : savedType)
    // Resume/draft state (mirrors the vendor inspection flow).
    const [isResume, setIsResume] = useState(hasResumableDraft)
    const [draftInspectionType] = useState<InspectionType | null>(savedType)
    const [discardConfirm, setDiscardConfirm] = useState<{ type: InspectionType } | null>(null)
    const [savingDraft, setSavingDraft] = useState(false)

    // ── Exit-confirmation guard ───────────────────────────────────────────────
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
            e.returnValue = ""
        }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [])

    useEffect(() => {
        window.history.pushState(null, "", window.location.href)
        const onPop = () => {
            if (allowLeaveRef.current) return
            window.history.pushState(null, "", window.location.href)
            requestExit(() => { allowLeaveRef.current = true; window.history.back() })
        }
        window.addEventListener("popstate", onPop)
        return () => window.removeEventListener("popstate", onPop)
    }, [])

    useEffect(() => {
        const onClickCapture = (e: MouseEvent) => {
            if (allowLeaveRef.current) return
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const anchor = (e.target as HTMLElement)?.closest("a") as HTMLAnchorElement | null
            if (!anchor) return
            if (rootRef.current?.contains(anchor)) return
            const href = anchor.getAttribute("href")
            if (!href || href.startsWith("#") || anchor.target === "_blank") return
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            requestExit(() => { allowLeaveRef.current = true; window.location.href = href })
        }
        document.addEventListener("click", onClickCapture, true)
        return () => document.removeEventListener("click", onClickCapture, true)
    }, [])

    // ── Form data ─────────────────────────────────────────────────────────────
    const prefilledRef = useRef<string | null>(null)

    const [formData, setFormData] = useState(() => loadDraft(productId, makeDefaultFormData(productName, vendorName)))
    // Set true by "Save draft & exit" so the debounced autosave (which holds an older
    // formData without pausedAt) can't fire afterwards and clobber the explicit draft.
    const skipAutosaveRef = useRef(false)

    // Persist a draft whenever the form changes (debounced). Falls back to a
    // photo-stripped draft if the full snapshot exceeds the localStorage quota.
    useEffect(() => {
        if (typeof window === "undefined" || !productId) return
        const key = draftKeyFor(productId)
        const t = setTimeout(() => {
            if (skipAutosaveRef.current) return
            // Heavy re-fetched context is excluded — it is reloaded from the API.
            const { productData: _pd, vendorData: _vd, ...rest } = formData as any
            try {
                window.localStorage.setItem(key, JSON.stringify(rest))
            } catch {
                try {
                    window.localStorage.setItem(key, JSON.stringify(stripBase64Deep(rest)))
                } catch {
                    /* quota still exceeded — give up silently, nothing we can do */
                }
            }
        }, 600)
        return () => clearTimeout(t)
    }, [formData, productId])

    // Tell the checker once, on mount, if we recovered a saved draft.
    useEffect(() => {
        if (typeof window === "undefined" || !productId) return
        try {
            if (window.localStorage.getItem(draftKeyFor(productId))) {
                showSuccessToast("Draft restored", "We recovered your in-progress inspection.")
            }
        } catch { /* ignore */ }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    // ── Autofill from API ─────────────────────────────────────────────────────
    useEffect(() => {
        let cancelled = false
        if (!productId || prefilledRef.current === productId) return

        const cached = qcCheckerService.getCheckerData?.()
        if (cached?.name && !cancelled) {
            setFormData((prev) => ({
                ...prev,
                inspectorSignature: prev.inspectorSignature || formatCheckerName(cached),
            }))
        }

        qcCheckerService
            .getProductDetails(productId)
            .then((res) => {
                if (cancelled || !res?.success) return
                const product = res.data.product
                const v = product?.vendor || {}

                // Booked window elapsed before opening → block the form; the
                // assignment must be rescheduled by the admin (backend enforces too).
                const a = product?.qcAssignment
                if (a?.scheduledDate && isInspectionWindowElapsed(a.scheduledDate, a.scheduledTime, a.estimatedDuration)) {
                    setExpiredError(
                        `This inspection's scheduled window (${formatAssignmentWindow(a.scheduledDate, a.scheduledTime, a.estimatedDuration)}) has passed. It can no longer be started — please ask the admin to schedule a new assignment.`
                    )
                    prefilledRef.current = productId
                    return
                }

                setFormData((prev) => ({
                    ...prev,
                    vendor: prev.vendor || v.companyName || vendorName,
                    vendorData: v,
                    productData: product,
                    // Overwrite inspectorSignature with the current name from DB (picks up admin edits)
                    inspectorSignature: product?.assignedQc ? formatCheckerName(product.assignedQc) : prev.inspectorSignature,
                }))

                prefilledRef.current = productId
            })
            .catch((err) => {
                if (!cancelled) console.error("PI autofill failed", err)
            })

        return () => { cancelled = true }
    }, [productId, vendorName])

    // ── Resume / draft orchestration (mirrors the vendor inspection flow) ──────
    // Called from the type dialog. A fresh inspection just starts; a paused resume
    // continues the draft on a matching type, or asks to discard on a different one.
    const persistType = (type: InspectionType) => {
        try { window.localStorage.setItem(typeKeyFor(productId), type) } catch { /* ignore */ }
    }

    const handleTypeChosen = (type: InspectionType) => {
        if (isResume) {
            const draftType = draftInspectionType || inspectionType
            if (type === draftType) {
                // Same type → resume the saved draft, folding the paused gap into
                // totalPausedMs so the report's duration stays accurate.
                setFormData((prev: any) => {
                    const pausedMs = prev.pausedAt ? Math.max(0, Date.now() - new Date(prev.pausedAt).getTime()) : 0
                    return { ...prev, totalPausedMs: (prev.totalPausedMs || 0) + pausedMs, pausedAt: null }
                })
                setIsResume(false)
                setInspectionType(type)
                persistType(type)
            } else {
                // Different type → confirm discarding the saved draft first.
                setDiscardConfirm({ type })
            }
        } else {
            setInspectionType(type)
            persistType(type)
        }
    }

    const confirmDiscardDraft = () => {
        if (!discardConfirm) return
        const { type } = discardConfirm
        // Wipe the saved draft and restart fresh at the current time, keeping only
        // the already-loaded product/vendor context and the inspector's name.
        try { window.localStorage.removeItem(draftKeyFor(productId)) } catch { /* ignore */ }
        setFormData((prev: any) => ({
            ...makeDefaultFormData(productName, vendorName),
            productData: prev.productData,
            vendorData: prev.vendorData,
            inspectorSignature: prev.inspectorSignature,
        }))
        setCurrentStep("generalInformation")
        setReviewMode(false)
        setDiscardConfirm(null)
        setIsResume(false)
        setInspectionType(type)
        persistType(type)
    }

    // Save the half-filled form as a paused draft, then leave. pausedAt marks the
    // pause so the next open re-prompts the inspection type (resume vs restart).
    const saveDraftAndExit = () => {
        setSavingDraft(true)
        // Block the debounced autosave from overwriting this explicit draft (which
        // carries pausedAt) with a stale, un-paused snapshot.
        skipAutosaveRef.current = true
        const next = { ...formData, pausedAt: new Date().toISOString() }
        try {
            const { productData: _pd, vendorData: _vd, ...rest } = next as any
            try { window.localStorage.setItem(draftKeyFor(productId), JSON.stringify(rest)) }
            catch { window.localStorage.setItem(draftKeyFor(productId), JSON.stringify(stripBase64Deep(rest))) }
            showSuccessToast("Draft saved", "Your progress has been saved — you can resume this inspection later.")
        } catch {
            showErrorToast("Could not save draft", "Your device storage is full. Try removing some photos.")
            setSavingDraft(false)
            return
        }
        setSavingDraft(false)
        setShowExitConfirm(false)
        allowLeaveRef.current = true
        const action = pendingNavRef.current
        pendingNavRef.current = null
        ;(action ?? onCancel ?? onComplete)?.()
    }

    // ── Step definitions ──────────────────────────────────────────────────────
    const steps: { id: Step; label: string; description: string }[] = [
        { id: "generalInformation",  label: "General Info",          description: "Vendor registration data and inspection context" },
        { id: "productVerification", label: "Product Verification",  description: "Field-level verification of all product data" },
        { id: "packagingInspection", label: "Packaging",             description: "Carton, retail packaging and product type" },
        { id: "testing",             label: "Testing",               description: "Comprehensive on-site test battery" },
        { id: "defects",             label: "Defects",               description: "AQL sampling and defect counts" },
        { id: "review",              label: "Review",                description: "Full summary and final decision" },
        { id: "documentation",       label: "Documentation",         description: "Report, signatures and final submit" },
    ]

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
    const isLastStep = currentStepIndex === steps.length - 1

    const scrollToTop = () => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
        window.scrollTo({ top: 0, behavior: "smooth" })
    }

    // On a validation failure, jump to the exact field/section that failed (marked
    // with data-invalid="true" by the step) and pulse a highlight — instead of
    // scrolling the whole page to the top. Runs after a short delay so the error
    // DOM (and any step change) has rendered. Falls back to the top if the step
    // hasn't marked a specific field.
    // Announce how many fields still need attention (counting the fields the steps
    // actually highlighted with data-invalid — accurate even for steps that collapse
    // many missing fields into one summary error), then scroll to + flash the first.
    // `fallbackCount` (from the error keys) is used only if the DOM highlight hasn't
    // rendered yet. Runs after a short delay so the invalid DOM exists.
    const flagAndScrollToErrors = (fallbackCount: number) => {
        const FLASH = ["ring-4", "ring-red-500", "ring-offset-2", "ring-offset-white", "rounded-2xl"]
        const announce = (count: number) => {
            const n = Math.max(count, 1)
            showErrorToast(
                `${n} ${n === 1 ? "field needs" : "fields need"} to be completed`,
                "The required fields are highlighted — jumping to the first one.",
            )
        }
        let attempts = 0
        const tryFind = () => {
            const els = rootRef.current?.querySelectorAll<HTMLElement>('[data-invalid="true"]')
            if (els && els.length > 0) {
                announce(els.length)
                const el = els[0]
                el.scrollIntoView({ behavior: "smooth", block: "center" })
                el.classList.add(...FLASH)
                window.setTimeout(() => el.classList.remove(...FLASH), 2200)
                return
            }
            if (attempts++ < 8) { window.setTimeout(tryFind, 80); return }
            // DOM highlight never appeared — fall back to the error-key count + top.
            announce(fallbackCount)
            scrollToTop()
        }
        window.setTimeout(tryFind, 60)
    }

    // ── Navigation ────────────────────────────────────────────────────────────
    const nextStep = () => {
        const stepErrors = validateStep(currentStep, formData)
        setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }))
        if (hasErrors(stepErrors)) {
            flagAndScrollToErrors(countErrors(stepErrors))
            return
        }

        // If editing a step from Review, go back to Review after saving
        if (reviewMode) {
            setReviewMode(false)
            setCurrentStep("review")
            scrollToTop()
            return
        }

        if (!isLastStep) {
            setCurrentStep(steps[currentStepIndex + 1].id)
            scrollToTop()
        }
    }

    const prevStep = () => {
        if (reviewMode) {
            setReviewMode(false)
            setCurrentStep("review")
            scrollToTop()
            return
        }
        if (currentStepIndex > 0) {
            setCurrentStep(steps[currentStepIndex - 1].id)
            scrollToTop()
        }
    }

    const goToStep = (target: Step) => {
        const targetIndex = steps.findIndex((s) => s.id === target)
        if (targetIndex === -1 || targetIndex === currentStepIndex) return
        const stepErrors = validateStep(currentStep, formData)
        setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }))
        setReviewMode(false)
        setCurrentStep(target)
        scrollToTop()
    }

    // Called by Review step's Edit buttons
    const handleEditStep = (stepId: string) => {
        setReviewMode(true)
        setCurrentStep(stepId as Step)
        scrollToTop()
    }

    // ── Submit ────────────────────────────────────────────────────────────────
    const cleanPhotos = (photos: any[]) => {
        if (!photos) return []
        return photos.map((p) => ({ name: p.name || "image.jpg", data: p.data || p.url || null }))
    }

    const handleSubmit = async () => {
        const all = validateAll(formData)
        if (Object.keys(all).length > 0) {
            setErrors(all)
            const firstInvalid = steps.find((s) => all[s.id as Step])
            if (firstInvalid) setCurrentStep(firstInvalid.id as Step)
            flagAndScrollToErrors(countAllErrors(all))
            return
        }

        setSubmitting(true)
        try {
            // Stamp the completion time and fold any still-open pause into totalPausedMs
            // so the report's active/paused/total duration is accurate. These ride along
            // in the form payload → persisted into the product's qcInspectionData.
            const completedIso = new Date().toISOString()
            const openPauseMs = formData.pausedAt ? Math.max(0, Date.now() - new Date(formData.pausedAt).getTime()) : 0
            const finalPausedMs = (formData.totalPausedMs || 0) + openPauseMs

            const cleanedData = {
                ...formData,
                inspectionCompletedAt: completedIso,
                totalPausedMs: finalPausedMs,
                pausedAt: null,
                packagingPhotos: cleanPhotos(formData.packagingPhotos),
                productEvidencePhotos: cleanPhotos(formData.productEvidencePhotos),
                defectPhotos: cleanPhotos(formData.defectPhotos),
                documentationPhotos: cleanPhotos(formData.documentationPhotos),
                photocopyDocuments: cleanPhotos(formData.photocopyDocuments),
                companyIdCards: cleanPhotos(formData.companyIdCards),
                signedDocuments: cleanPhotos(formData.signedDocuments),
                signedReport: cleanPhotos(formData.signedReport),
                // Clean nested photos in testGroups
                testGroups: (formData.testGroups || []).map((g: any) => ({
                    ...g,
                    tests: (g.tests || []).map((t: any) => ({
                        ...t,
                        rightPhotos: cleanPhotos(t.rightPhotos),
                        wrongPhotos: cleanPhotos(t.wrongPhotos),
                    })),
                })),
                // Clean additionalEvidence
                additionalEvidence: Object.fromEntries(
                    Object.entries(formData.additionalEvidence || {}).map(([k, v]) => [k, cleanPhotos(v as any[])])
                ),
            }

            // Route on the checker's ACTUAL decision from the Review step
            // (inspectionStatus), not the hard-coded finalDecision. Only an
            // explicit "Rejected" hits the reject endpoint; "Approved",
            // "On Hold" and "Re-Inspection" go through approve, which derives
            // the final approvalStatus from inspectionStatus on the backend.
            // Capture the device GPS before submitting — for a PHYSICAL inspection.
            // captureCoordsForSubmit returns null for a virtual one, so no location is
            // captured or validated; the geofence is skipped end to end.
            const type: InspectionType = inspectionType ?? "PHYSICAL"
            const coords = await captureCoordsForSubmit(type)

            if (formData.inspectionStatus === "Rejected") {
                const reason = (formData.reviewerRemarks || "").trim() || "Rejected during QC product inspection"
                await qcCheckerService.rejectProduct(productId, reason, cleanedData, coords, type)
            } else {
                await qcCheckerService.approveProduct(productId, cleanedData, coords, type)
            }

            allowLeaveRef.current = true
            // Inspection submitted — the draft and the saved type are no longer needed.
            try {
                window.localStorage.removeItem(draftKeyFor(productId))
                window.localStorage.removeItem(typeKeyFor(productId))
            } catch { /* ignore */ }
            showSuccessToast("Success", "Product inspection submitted successfully.")
            onComplete()
        } catch (error: any) {
            // Backend deadline guard — surface the expired screen rather than a toast.
            const msg: string = error?.message || ""
            if (error?.code === "INSPECTION_EXPIRED" || error?.status === 409 && /window|expired/i.test(msg)) {
                setExpiredError(msg || "This inspection's scheduled window has passed and can no longer be submitted.")
            } else {
                showErrorToast("Submission Failed", error.message || "Unable to submit inspection.")
            }
        } finally {
            setSubmitting(false)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────
    if (expiredError) {
        return (
            <div className="min-h-screen flex items-center justify-center p-6 bg-[#f7f7f5]">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-8 max-w-md w-full text-center space-y-5">
                    <div className="w-14 h-14 rounded-full flex items-center justify-center mx-auto bg-amber-50">
                        <AlarmClockOff className="w-7 h-7 text-amber-500" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-900 mb-1">Inspection Window Expired</h2>
                        <p className="text-slate-600 text-sm leading-relaxed">{expiredError}</p>
                        <p className="text-slate-500 text-xs leading-relaxed mt-2">
                            The admin has been asked to schedule a new assignment for this product.
                        </p>
                    </div>
                    <button
                        onClick={onComplete}
                        className="w-full px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 text-white transition-colors"
                    >
                        Back to Products
                    </button>
                </div>
            </div>
        )
    }

    return (
        <div ref={rootRef} className="min-h-screen font-sans bg-[#f7f7f5]">
            {/* Mandatory type selection — shown until the checker chooses (and re-asked
                when resuming a paused draft). Cancelling backs out of the inspection. */}
            {!inspectionType && !discardConfirm && (
                <InspectionTypeDialog
                    subjectName={productName}
                    onSelect={handleTypeChosen}
                    onCancel={() => { (onCancel ?? onComplete)() }}
                />
            )}

            {/* Discard-draft confirmation — shown when resuming with a DIFFERENT type
                than the saved draft, which can't be carried over. */}
            {discardConfirm && (
                <div
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4"
                    role="dialog"
                    aria-modal="true"
                    onClick={() => setDiscardConfirm(null)}
                >
                    <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-6">
                            <div className="flex items-start gap-4">
                                <div className="flex-shrink-0 w-12 h-12 rounded-full bg-amber-50 flex items-center justify-center">
                                    <AlertTriangle className="w-6 h-6 text-amber-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-bold text-slate-900">Discard saved draft?</h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        You saved this inspection as a <span className="font-semibold">{(draftInspectionType || "").toLowerCase()}</span> inspection.
                                        Switching to <span className="font-semibold">{discardConfirm.type.toLowerCase()}</span> will
                                        <span className="font-semibold text-amber-700"> discard the saved draft</span> and start a fresh inspection at the current time.
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="flex gap-3 px-6 py-4 bg-slate-50 border-t border-slate-100">
                            <button
                                onClick={() => setDiscardConfirm(null)}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors"
                            >
                                Go back
                            </button>
                            <button
                                onClick={confirmDiscardDraft}
                                className="flex-1 px-4 py-2.5 rounded-xl font-semibold bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white transition-colors shadow-sm"
                            >
                                Discard &amp; start fresh
                            </button>
                        </div>
                    </div>
                </div>
            )}
            <div className="p-8 max-w-5xl mx-auto">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center gap-4 mb-4">
                        <button
                            onClick={() => requestExit(onCancel)}
                            className="p-2 hover:bg-white rounded-lg transition-colors"
                            aria-label="Back"
                        >
                            <ArrowLeft className="w-5 h-5 text-slate-600" />
                        </button>
                        <div>
                            <h1 className="text-4xl font-bold text-slate-900">Product Inspection</h1>
                            <p className="text-slate-600 text-lg">
                                {productName}
                                {vendorName ? <span className="text-slate-400"> · {vendorName}</span> : null}
                            </p>
                        </div>
                    </div>
                    {reviewMode && (
                        <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl px-4 py-3 text-sm font-medium text-brand-700">
                            <RotateCcw className="w-4 h-4" />
                            Editing from Review — click Save &amp; Continue to return.
                        </div>
                    )}
                </div>

                {/* Step Indicator */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8 overflow-x-auto">
                    <div className="relative mb-8 min-w-[700px]">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const stepHasErrors = hasErrors(errors[step.id])
                                return (
                                    <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 text-sm border-2 cursor-pointer ${
                                                stepHasErrors
                                                    ? "bg-red-50 border-red-500 text-red-600 ring-4 ring-red-100 hover:bg-red-100"
                                                    : index < currentStepIndex
                                                    ? "bg-brand-500 text-white border-brand-500 shadow-sm hover:bg-brand-600"
                                                    : index === currentStepIndex
                                                    ? "bg-brand-500 text-white border-brand-500 ring-4 ring-brand-100"
                                                    : "bg-white border-slate-200 text-slate-500 hover:border-brand-400 hover:bg-brand-50 hover:text-brand-600"
                                            }`}
                                            onClick={() => goToStep(step.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") { e.preventDefault(); goToStep(step.id) }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            aria-current={index === currentStepIndex ? "step" : undefined}
                                            aria-label={`Go to ${step.label}${stepHasErrors ? " (has errors)" : ""}`}
                                        >
                                            {stepHasErrors ? "!" : index < currentStepIndex ? <Check className="w-5 h-5" /> : index + 1}
                                        </div>
                                        <div className="mt-3 text-center max-w-24">
                                            <p className={`text-xs font-medium leading-tight ${
                                                stepHasErrors ? "text-red-600"
                                                    : index === currentStepIndex ? "text-slate-900"
                                                    : index < currentStepIndex ? "text-slate-900"
                                                    : "text-slate-500"
                                            }`}>
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                        {/* Progress line */}
                        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200 z-0">
                            <div
                                className="h-full bg-brand-500 transition-all duration-500 ease-out"
                                style={{ width: `${(currentStepIndex / (steps.length - 1)) * 100}%` }}
                            />
                        </div>
                    </div>

                    <div className="text-center bg-slate-50 rounded-xl p-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-brand-500 rounded-full" />
                            <p className="text-slate-600 text-sm font-medium">
                                Step {currentStepIndex + 1} of {steps.length}
                            </p>
                            <div className="w-2 h-2 bg-brand-500 rounded-full" />
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-1">{steps[currentStepIndex].label}</h3>
                        <p className="text-slate-600 text-sm">{steps[currentStepIndex].description}</p>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8">
                    {currentStep === "generalInformation" && (
                        <PI_Step1_GeneralInfo formData={formData} setFormData={setFormData} errors={errors.generalInformation || {}} />
                    )}
                    {currentStep === "productVerification" && (
                        <PI_Step2_ProductVerification formData={formData} setFormData={setFormData} errors={errors.productVerification || {}} />
                    )}
                    {currentStep === "packagingInspection" && (
                        <PI_Step3_PackagingInspection formData={formData} setFormData={setFormData} errors={errors.packagingInspection || {}} />
                    )}
                    {currentStep === "defects" && (
                        <Defects formData={formData} setFormData={setFormData} errors={errors.defects || {}} />
                    )}
                    {currentStep === "testing" && (
                        <PI_Step5_Testing formData={formData} setFormData={setFormData} errors={errors.testing || {}} />
                    )}
                    {currentStep === "review" && (
                        <PI_Step6_Review formData={formData as any} setFormData={setFormData} onEditStep={handleEditStep} errors={errors.review || {}} />
                    )}
                    {currentStep === "documentation" && (
                        <Documentation formData={formData} setFormData={setFormData} errors={errors.documentation || {}} />
                    )}
                </div>

                {/* Navigation */}
                <div className="flex gap-4 justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStepIndex === 0 && !reviewMode}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${
                            currentStepIndex === 0 && !reviewMode
                                ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed"
                                : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                        }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        {reviewMode ? "Back to Review" : "Previous"}
                    </button>

                    {isLastStep && !reviewMode ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors shadow-sm ${submitting ? "opacity-70 cursor-not-allowed" : ""}`}
                        >
                            <Check className="w-5 h-5" />
                            {submitting ? "Submitting…" : "Submit Inspection"}
                        </button>
                    ) : (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-colors shadow-sm"
                        >
                            {reviewMode ? "Save & Continue" : "Next"}
                            <ArrowRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>

            {/* Exit-confirmation modal */}
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
                                        {inspectionType
                                            ? "You can save your progress as a draft and resume this inspection later, or exit without saving."
                                            : "Are you sure you want to exit? Your inspection progress will be lost and won’t be saved."}
                                    </p>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 space-y-3">
                            {inspectionType && (
                                <button
                                    onClick={saveDraftAndExit}
                                    disabled={savingDraft}
                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-semibold bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white transition-colors shadow-sm disabled:opacity-70"
                                >
                                    {savingDraft ? "Saving draft…" : "Save draft & exit"}
                                </button>
                            )}
                            <div className="flex gap-3">
                                <button onClick={cancelExit} disabled={savingDraft} className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 transition-colors disabled:opacity-70">
                                    Keep editing
                                </button>
                                <button onClick={confirmExit} disabled={savingDraft} className="flex-1 px-4 py-2.5 rounded-xl font-semibold border border-red-200 bg-white text-red-600 hover:bg-red-50 transition-colors disabled:opacity-70">
                                    Exit without saving
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}