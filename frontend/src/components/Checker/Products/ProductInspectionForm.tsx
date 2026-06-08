"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"

// Import steps from the actual paths
import GeneralInformation from "@/components/Checker/Vendor/Steps/GeneralInformation"
import Preparation from "@/components/Checker/Vendor/Steps/Preparation"
import Measurements from "@/components/Checker/Vendor/Steps/Measurements"
import Packaging from "@/components/Checker/Vendor/Steps/Packaging"
import Defects from "@/components/Checker/Vendor/Steps/Defects"
import Testing from "@/components/Checker/Vendor/Steps/Testing"
import Documentation from "@/components/Checker/Vendor/Steps/Documentation"
import Review from "@/components/Checker/Vendor/Steps/Review"

import { qcCheckerService } from "@/services/qcCheckerService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
import {
    validateStep,
    validateAll,
    hasErrors,
    firstErrorMessage,
    type Step as ValidationStep,
    type AllErrors,
} from "@/components/Checker/Products/validation"

// Default test battery rendered when the parent seeds `tests: []`. Kept in
// sync with the defaults in Testing.tsx so a fresh inspection always starts
// with the full 5-test list visible.
const DEFAULT_TESTS = [
    { id: "dropTestResult", label: "Carton Drop Test", detail: "Action and result views" },
    { id: "colorFastnessDry", label: "Color Fastness (Dry)", detail: "Dry cloth rubbing test" },
    { id: "colorFastnessWet", label: "Color Fastness (Wet)", detail: "Wet cloth rubbing test" },
    { id: "seamStrengthResult", label: "Seam Strength Test", detail: "Pull gauge testing" },
    { id: "smellCheck", label: "Smell Check", detail: "Unusual odor detection" },
].map((t) => ({ ...t, pass: false, fail: false, photos: [], rightPhotos: [], wrongPhotos: [] }))

interface ProductInspectionFormProps {
    productId: string
    productName: string
    vendorName: string
    onComplete: () => void
    onCancel: () => void
}

type Step = ValidationStep

export default function ProductInspectionForm({
    productId,
    productName,
    vendorName,
    onComplete,
    onCancel,
}: ProductInspectionFormProps) {
    const [currentStep, setCurrentStep] = useState<Step>("generalInformation")
    const [submitting, setSubmitting] = useState(false)
    const [errors, setErrors] = useState<AllErrors>({})

    // ── Exit-confirmation guard ────────────────────────────────────────────────
    // While the inspection is being filled, any accidental navigation away
    // (sidebar/menu link, browser back, tab close/refresh, or the form's own
    // back arrow) should prompt "are you sure you want to exit?" so in-progress
    // work isn't lost. `allowLeaveRef` short-circuits the guard once the user has
    // confirmed an exit or the inspection has been submitted successfully.
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const pendingNavRef = useRef<null | (() => void)>(null)
    const allowLeaveRef = useRef(false)
    const rootRef = useRef<HTMLDivElement>(null)

    // Route a navigation attempt through the confirmation modal. If the guard is
    // disabled (already confirmed / submitted) the action runs immediately.
    const requestExit = (action: () => void) => {
        if (allowLeaveRef.current) {
            action()
            return
        }
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

    // Warn on tab close / refresh / hard browser navigation.
    useEffect(() => {
        const handler = (e: BeforeUnloadEvent) => {
            if (allowLeaveRef.current) return
            e.preventDefault()
            e.returnValue = ""
        }
        window.addEventListener("beforeunload", handler)
        return () => window.removeEventListener("beforeunload", handler)
    }, [])

    // Intercept the browser Back button. We seed a dummy history entry so the
    // first Back fires a popstate we can catch; we re-seed it to stay on the page
    // and surface the confirmation instead.
    useEffect(() => {
        window.history.pushState(null, "", window.location.href)
        const onPop = () => {
            if (allowLeaveRef.current) return
            window.history.pushState(null, "", window.location.href)
            requestExit(() => {
                allowLeaveRef.current = true
                window.history.back()
            })
        }
        window.addEventListener("popstate", onPop)
        return () => window.removeEventListener("popstate", onPop)
    }, [])

    // Intercept clicks on navigation links outside the form (e.g. the checker
    // sidebar menu). Capture phase + stopImmediatePropagation runs before React's
    // Link handler, so we can hold the navigation behind the confirmation modal.
    useEffect(() => {
        const onClickCapture = (e: MouseEvent) => {
            if (allowLeaveRef.current) return
            if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
            const target = e.target as HTMLElement | null
            const anchor = target?.closest("a") as HTMLAnchorElement | null
            if (!anchor) return
            if (rootRef.current && rootRef.current.contains(anchor)) return
            const href = anchor.getAttribute("href")
            if (!href || href.startsWith("#") || anchor.target === "_blank") return
            e.preventDefault()
            e.stopPropagation()
            e.stopImmediatePropagation()
            requestExit(() => {
                allowLeaveRef.current = true
                window.location.href = href
            })
        }
        document.addEventListener("click", onClickCapture, true)
        return () => document.removeEventListener("click", onClickCapture, true)
    }, [])

    // Snapshot of which fields the server supplied at autofill time. Used by
    // the child steps (General Information today) to decide which inputs stay
    // editable vs. lock to readonly. Stable across typing + step remounts.
    const [autofillSnapshot, setAutofillSnapshot] = useState<Record<string, boolean>>({})
    // Guards the autofill effect against StrictMode double-invoke and
    // clobbering checker edits on parent re-renders.
    const prefilledForProductIdRef = useRef<string | null>(null)

    const [formData, setFormData] = useState({
        // GeneralInformation
        client: "M2C",
        vendor: vendorName,
        factory: "",
        serviceLocation: "",
        serviceStartDate: new Date().toISOString().split('T')[0],
        serviceType: "Pre-Shipment Inspection",

        // Preparation
        items: [{
            id: 1,
            itemName: productName,
            itemDescription: "Standard Product Assessment",
            totalQuantity: 0,
            inspectionQuantity: 0
        }],
        warehousePhotoEvidences: [] as any[],

        // Measurements
        measurements: [] as any[],
        measurementPhotos: [] as any[],

        // Packaging
        shipperCartonRemark: "",
        innerCartonRemark: "",
        retailPackagingRemark: "",
        productTypeRemark: "",
        aqlWorkmanshipRemark: "",
        onSiteTestsRemark: "",
        packagingPhotos: [] as any[],

        // Defects 
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

        // Testing — seeded with the 5-test battery so the step renders
        // correctly on first open. Replaces the old empty-array init that
        // tripped the truthy-check in Testing.tsx.
        tests: DEFAULT_TESTS as any[],
        testingPhotos: [] as any[],

        // Documentation
        inspectorSignature: "",
        documentationPhotos: [] as any[],
        photocopyDocuments: [] as any[],
        companyIdCards: [] as any[],

        // Review / Final Decision
        finalDecision: "Approved", // Approved, Rejected
        reviewerRemarks: ""
    })

    // Autofill factory + service location from the vendor record, inspector
    // signature from the cached checker profile. Runs once per productId
    // (ref guard survives StrictMode / Fast Refresh / parent re-renders).
    // Checker edits are always preserved: `prev.X || …` falls through only
    // when the checker has not typed anything yet.
    useEffect(() => {
        let cancelled = false
        if (!productId) return
        if (prefilledForProductIdRef.current === productId) return

        const cached = qcCheckerService.getCheckerData?.()
        if (cached?.name && !cancelled) {
            setFormData((prev) => ({
                ...prev,
                inspectorSignature: prev.inspectorSignature || cached.name,
            }))
        }

        const isNonEmpty = (s?: string | null) =>
            typeof s === "string" && s.trim() !== ""

        qcCheckerService
            .getProductDetails(productId)
            .then((res) => {
                if (cancelled || !res?.success) return
                const product = res.data.product
                const v = product?.vendor || {}
                const factoryName = v.companyName || ""
                const serviceLocation = [v.factoryCity, v.factoryState]
                    .filter(Boolean)
                    .join(", ")

                setFormData((prev) => ({
                    ...prev,
                    factory: prev.factory || factoryName,
                    serviceLocation: prev.serviceLocation || serviceLocation,
                }))

                setAutofillSnapshot({
                    // Client + vendor come from parent state / props and are
                    // always non-empty when this branch runs, so lock them.
                    client: true,
                    vendor: isNonEmpty(vendorName),
                    factory: isNonEmpty(factoryName),
                    serviceLocation: isNonEmpty(serviceLocation),
                })

                prefilledForProductIdRef.current = productId
            })
            .catch((err) => {
                if (cancelled) return
                console.error("Failed to autofill product inspection form", err)
            })

        return () => {
            cancelled = true
        }
    }, [productId, vendorName])

    const steps: { id: Step; label: string; description: string }[] = [
        { id: "generalInformation", label: "General Info", description: "Client, vendor and service context" },
        { id: "preparation", label: "Preparation", description: "Items and warehouse evidence" },
        { id: "measurements", label: "Measurements", description: "Dimensions and tolerances" },
        { id: "packaging", label: "Packaging", description: "Carton, retail and workmanship" },
        { id: "defects", label: "Defects", description: "AQL sampling and defect counts" },
        { id: "testing", label: "Testing", description: "On-site test battery results" },
        { id: "documentation", label: "Documentation", description: "Signatures and supporting docs" },
        { id: "review", label: "Review", description: "Final decision and sign-off" },
    ]

    const currentStepIndex = steps.findIndex((s) => s.id === currentStep)
    const isLastStep = currentStepIndex === steps.length - 1

    const nextStep = () => {
        // Validate the current step before advancing so half-filled inspection
        // reports can't be walked through by hitting Next repeatedly. Matches
        // the Vendor Inspection flow.
        const stepErrors = validateStep(currentStep, formData)
        setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }))
        if (hasErrors(stepErrors)) {
            showErrorToast(
                "Please complete this step",
                firstErrorMessage(stepErrors) || "Some required fields are missing."
            )
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }
        if (!isLastStep) {
            setCurrentStep(steps[currentStepIndex + 1].id)
        }
    }

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(steps[currentStepIndex - 1].id)
        }
    }

    // Allow clicking any step circle to jump there, but revalidate the step
    // we're leaving so errors stay surfaced.
    const goToStep = (target: Step) => {
        const stepErrors = validateStep(currentStep, formData)
        setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }))
        setCurrentStep(target)
    }

    // Helper to clean photo data before submission
    const cleanPhotos = (photos: any[]) => {
        if (!photos) return [];
        return photos.map(p => ({
            name: p.name || 'image.jpg',
            data: p.data || p.url || null // Ensure we send the base64 data
        }));
    }

    const handleSubmit = async () => {
        // Full form validation before submit. Populates `errors` so every
        // invalid step lights up red in the sidebar, and jumps the checker to
        // the first invalid step so they can start fixing from the top.
        const all = validateAll(formData)
        if (Object.keys(all).length > 0) {
            setErrors(all)
            const firstInvalid = steps.find((s) => all[s.id])?.id
            if (firstInvalid) setCurrentStep(firstInvalid)
            showErrorToast(
                "Cannot submit yet",
                "Some required fields are missing. Review the highlighted steps."
            )
            window.scrollTo({ top: 0, behavior: "smooth" })
            return
        }

        setSubmitting(true)

        try {
            // Clean the entire form data from blob URLs and File objects
            const cleanedData = {
                ...formData,
                warehousePhotoEvidences: cleanPhotos(formData.warehousePhotoEvidences),
                measurementPhotos: cleanPhotos(formData.measurementPhotos),
                packagingPhotos: cleanPhotos(formData.packagingPhotos),
                defectPhotos: cleanPhotos(formData.defectPhotos),
                testingPhotos: cleanPhotos(formData.testingPhotos),
                documentationPhotos: cleanPhotos(formData.documentationPhotos),
                photocopyDocuments: cleanPhotos(formData.photocopyDocuments),
                companyIdCards: cleanPhotos(formData.companyIdCards),
                // Also clean nested test photos if they exist
                tests: (formData.tests || []).map((test: any) => ({
                    ...test,
                    photos: cleanPhotos(test.photos),
                    rightPhotos: cleanPhotos(test.rightPhotos),
                    wrongPhotos: cleanPhotos(test.wrongPhotos)
                }))
            }

            if (formData.finalDecision === "Approved") {
                await qcCheckerService.approveProduct(productId, cleanedData)
            } else {
                await qcCheckerService.rejectProduct(productId, formData.reviewerRemarks, cleanedData)
            }
            // Submission succeeded — disable the exit guard so the post-submit
            // redirect (and any cleanup navigation) isn't blocked by the modal.
            allowLeaveRef.current = true
            showSuccessToast("Success", "Product inspection completed and submitted successfully.")
            onComplete()
        } catch (error: any) {
            showErrorToast("Submission Failed", error.message || "Unable to submit inspection.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div ref={rootRef} className="min-h-screen font-sans bg-[#f7f7f5]">
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
                </div>

                {/* Step Indicator */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8 overflow-x-auto">
                    {/* Progress Bar */}
                    <div className="relative mb-8 min-w-[820px]">
                        <div className="flex items-center justify-between">
                            {steps.map((step, index) => {
                                const stepHasErrors = hasErrors(errors[step.id])
                                return (
                                    <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                                        {/* Step Circle */}
                                        <div
                                            className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 cursor-pointer text-sm border-2 ${stepHasErrors
                                                ? "bg-red-50 border-red-500 text-red-600 ring-4 ring-red-100"
                                                : index < currentStepIndex
                                                    ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/10"
                                                    : index === currentStepIndex
                                                        ? "bg-brand-500 text-white border-brand-500 shadow-sm shadow-brand-500/10 ring-4 ring-brand-100"
                                                        : "bg-white border-slate-200 text-slate-500 hover:border-slate-300"
                                                }`}
                                            onClick={() => goToStep(step.id)}
                                            onKeyDown={(e) => {
                                                if (e.key === "Enter" || e.key === " ") {
                                                    e.preventDefault()
                                                    goToStep(step.id)
                                                }
                                            }}
                                            role="button"
                                            tabIndex={0}
                                            aria-current={index === currentStepIndex ? "step" : undefined}
                                            aria-label={`Go to ${step.label}${stepHasErrors ? " (has errors)" : ""}`}
                                        >
                                            {stepHasErrors ? "!" : index < currentStepIndex ? <Check className="w-5 h-5" /> : index + 1}
                                        </div>

                                        {/* Step Label */}
                                        <div className="mt-3 text-center max-w-24">
                                            <p
                                                className={`text-xs font-medium leading-tight ${stepHasErrors
                                                    ? "text-red-600"
                                                    : index <= currentStepIndex ? "text-slate-900" : "text-slate-500"
                                                    }`}
                                            >
                                                {step.label}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>

                        {/* Progress Line */}
                        <div className="absolute top-6 left-6 right-6 h-0.5 bg-slate-200 z-0">
                            <div
                                className="h-full bg-brand-500 transition-all duration-500 ease-out"
                                style={{
                                    width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                                }}
                            />
                        </div>
                    </div>

                    {/* Current Step Info */}
                    <div className="text-center bg-slate-50 rounded-xl p-6">
                        <div className="flex items-center justify-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                            <p className="text-slate-600 text-sm font-medium">
                                Step {currentStepIndex + 1} of {steps.length}
                            </p>
                            <div className="w-2 h-2 bg-brand-500 rounded-full"></div>
                        </div>
                        <h3 className="text-slate-900 font-bold text-xl mb-1">
                            {steps[currentStepIndex].label}
                        </h3>
                        <p className="text-slate-600 text-sm">
                            {steps[currentStepIndex].description}
                        </p>
                    </div>
                </div>

                {/* Step Content */}
                <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8">
                    {currentStep === "generalInformation" && (
                        <GeneralInformation formData={formData} setFormData={setFormData} autofillSnapshot={autofillSnapshot} />
                    )}
                    {currentStep === "preparation" && (
                        <Preparation formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "measurements" && (
                        <Measurements formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "packaging" && (
                        <Packaging formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "defects" && (
                        <Defects formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "testing" && (
                        <Testing formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "documentation" && (
                        <Documentation formData={formData} setFormData={setFormData} />
                    )}
                    {currentStep === "review" && (
                        <Review formData={formData as any} />
                    )}
                </div>

                {/* Navigation Buttons */}
                <div className="flex gap-4 justify-between">
                    <button
                        onClick={prevStep}
                        disabled={currentStepIndex === 0}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${currentStepIndex === 0
                            ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                            : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
                            }`}
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Previous
                    </button>

                    {isLastStep ? (
                        <button
                            onClick={handleSubmit}
                            disabled={submitting}
                            className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors duration-200 shadow-sm shadow-emerald-600/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                            <Check className="w-5 h-5" />
                            {submitting ? "Submitting..." : "Complete Product Inspection"}
                        </button>
                    ) : (
                        <button
                            onClick={nextStep}
                            className="flex items-center gap-2 px-6 py-3 bg-brand-500 hover:bg-brand-600 active:bg-brand-700 text-white font-semibold rounded-xl transition-colors duration-200 shadow-sm shadow-brand-500/10 outline-none focus-visible:ring-2 focus-visible:ring-brand-500/40"
                        >
                            Next
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
                                    <h3 id="exit-confirm-title" className="text-lg font-bold text-slate-900">
                                        Exit inspection?
                                    </h3>
                                    <p className="mt-1 text-sm text-slate-600">
                                        Are you sure you want to exit? Your inspection progress on this form
                                        will be lost and won&apos;t be saved.
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
