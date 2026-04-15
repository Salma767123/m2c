"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ArrowLeft, ArrowRight } from "lucide-react"

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

    const steps: { id: Step; label: string }[] = [
        { id: "generalInformation", label: "General Information" },
        { id: "preparation", label: "Preparation" },
        { id: "measurements", label: "Measurements" },
        { id: "packaging", label: "Packaging" },
        { id: "defects", label: "Defects" },
        { id: "testing", label: "Testing" },
        { id: "documentation", label: "Documentation" },
        { id: "review", label: "Review & Sign-Off" },
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
            showSuccessToast("Success", "Product inspection completed and submitted successfully.")
            onComplete()
        } catch (error: any) {
            showErrorToast("Submission Failed", error.message || "Unable to submit inspection.")
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200">
            <div className="flex border-b border-slate-200">
                {/* Sidebar */}
                <div className="w-1/4 p-6 border-r border-slate-200 hidden md:block">
                    <h3 className="text-lg font-bold text-slate-900 mb-6 font-display">Product Inspection</h3>
                    <nav className="space-y-2">
                        {steps.map((step, index) => {
                            const isActive = currentStep === step.id
                            const isPast = steps.findIndex((s) => s.id === currentStep) > index
                            const stepHasErrors = hasErrors(errors[step.id])

                            return (
                                <button
                                    key={step.id}
                                    onClick={() => goToStep(step.id)}
                                    aria-current={isActive ? "step" : undefined}
                                    aria-label={`${step.label}${stepHasErrors ? " (has errors)" : ""}`}
                                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 text-left ${stepHasErrors
                                        ? "bg-red-50 text-red-700"
                                        : isActive
                                            ? "bg-blue-50 text-blue-700"
                                            : isPast
                                                ? "text-slate-600 hover:bg-slate-50"
                                                : "text-slate-400 hover:bg-slate-50"
                                        }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-semibold transition-colors duration-200 ${stepHasErrors
                                            ? "bg-red-100 text-red-600 ring-2 ring-red-200"
                                            : isActive
                                                ? "bg-blue-100 text-blue-700 font-bold"
                                                : isPast
                                                    ? "bg-green-100 text-green-600"
                                                    : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {stepHasErrors ? "!" : isPast ? <Check className="w-4 h-4" /> : index + 1}
                                    </div>
                                    <span className={`font-medium ${isActive ? "font-bold" : ""}`}>
                                        {step.label}
                                    </span>
                                </button>
                            )
                        })}
                    </nav>
                </div>

                {/* Form Content */}
                <div className="flex-1 flex flex-col min-h-[600px]">
                    <div className="p-8 flex-1">
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

                    <div className="p-6 border-t border-slate-200 bg-slate-50 rounded-b-2xl flex items-center justify-between">
                        <div>
                            <button
                                onClick={onCancel}
                                className="px-6 py-2.5 text-slate-600 hover:bg-slate-200 rounded-xl font-medium transition-colors duration-200"
                            >
                                Cancel
                            </button>
                        </div>
                        <div className="flex gap-4">
                            {currentStepIndex > 0 && (
                                <button
                                    type="button"
                                    onClick={prevStep}
                                    className="flex items-center px-6 py-2.5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl font-medium transition-colors duration-200"
                                >
                                    <ArrowLeft className="w-4 h-4 mr-2" />
                                    Previous
                                </button>
                            )}
                            {isLastStep ? (
                                <button
                                    type="button"
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="flex items-center px-6 py-2.5 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {submitting ? "Submitting..." : "Submit Report"}
                                    {!submitting && <Check className="w-4 h-4 ml-2" />}
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    onClick={nextStep}
                                    className="flex items-center px-6 py-2.5 bg-slate-900 text-white hover:bg-slate-800 rounded-xl font-medium shadow-sm transition-all duration-200"
                                >
                                    Next Step
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
