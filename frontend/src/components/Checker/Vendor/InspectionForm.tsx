"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ArrowLeft, ArrowRight } from "lucide-react"
import FactoryDetails from "./Steps/FactoryDetails"
import LegalRegistration from "./Steps/LegalRegistration"
import ProductionInfo from "./Steps/ProductionInfo"
import BasicInfrastructure from "./Steps/BasicInfrastructure"
import QualitySafety from "./Steps/QualitySafety"
import InspectionInfo from "./Steps/InspectionInfo"
import BasicEvidence from "./Steps/BasicEvidence"

import qcCheckerService from "@/services/qcCheckerService"
import { showSuccessToast, showErrorToast } from "@/lib/toast-utils"
import { validateStep, validateAll, hasErrors, groupFieldErrors, type Step as ValidationStep, type StepErrors, type AllErrors } from "./validation"

interface InspectionFormProps {
  vendorName: string
  vendorId?: string
  onComplete: () => void
}

type Step = ValidationStep

export default function InspectionForm({ vendorName, vendorId, onComplete }: InspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("factoryDetails")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  const [errors, setErrors] = useState<AllErrors>({})
  // Snapshot of which vendor-sourced fields had a value at autofill time.
  // Locked once, then used for readonly decisions across all steps — so typing
  // into a field that the vendor left empty can never silently re-lock it,
  // and the decision survives step unmount/remount during navigation.
  const [autofillSnapshot, setAutofillSnapshot] = useState<Record<string, boolean>>({})
  const [formData, setFormData] = useState({
    // 1. Factory Details
    vendorName: vendorName,
    vendorId: vendorId || "",
    vendorCode: "",
    factoryName: "",
    factoryAddress: "",
    contactPersonName: "",
    contactPhoneNumber: "",

    // 2. Legal & Registration
    businessRegistrationNumber: "",
    gstTaxId: "",
    factoryLicenseNumber: "",

    // 3. Production Info
    productsManufactured: "",
    monthlyProductionCapacity: "",
    numberOfProductionWorkers: "",
    categoryToInspect: "",

    // 4. Basic Infrastructure Check
    machineryAvailable: "Yes",
    electricityAvailable: "Yes",
    waterAvailable: "Yes",
    storageAreaAvailable: "Yes",

    // 5. Quality & Safety
    qualityCheckProcess: "Yes",
    safetyEquipment: "Yes",
    cleanWorkingEnvironment: "Yes",

    // 6. Inspection Info
    inspectionDate: "",
    inspectorName: "",
    inspectionStatus: "Approved",
    inspectorRemarks: "",

    // 7. Basic Evidence
    factoryPhotos: [] as any[],
    documentsUpload: [] as any[]
  })

  // Tracks which vendorId has already been prefilled. Prevents the effect
  // from clobbering checker edits (including intentional clears) on re-fire —
  // StrictMode double-invoke, Fast Refresh, parent re-renders all land here.
  const prefilledForVendorIdRef = useRef<string | null>(null)

  // Fetch inspection data and auto-start if SCHEDULED.
  // Fast path: single scoped request, inspector name from localStorage, auto-start runs
  // in background (does not gate first paint).
  useEffect(() => {
    let cancelled = false

    async function loadActiveInspection() {
      // Inspector name from cached login data — zero network cost.
      // `prev.inspectorName ||` so a typed value is never overwritten.
      const cached = qcCheckerService.getCheckerData?.()
      if (cached?.name && !cancelled) {
        setFormData(prev => ({ ...prev, inspectorName: prev.inspectorName || cached.name }))
      }

      if (!vendorId) {
        if (!cancelled) setLoading(false)
        return
      }

      // One-shot guard: skip prefill + auto-start if we've already done both
      // for this vendorId in this component lifecycle.
      if (prefilledForVendorIdRef.current === vendorId) {
        if (!cancelled) setLoading(false)
        return
      }

      try {
        const res = await qcCheckerService.getActiveInspectionForVendor(vendorId)
        if (cancelled) return

        const inspection = res?.inspection
        if (inspection) {
          setInspectionId(inspection.id)

          const assignedCategories = Array.isArray(inspection.itemsToInspect)
            ? inspection.itemsToInspect.map((i: any) => i.itemName).join(', ')
            : ""

          // Prefill from vendor record. All fields stay editable — checker can
          // correct discrepancies they see at the factory. prev.* takes precedence
          // so user edits are never overwritten on re-renders.
          const v = inspection.vendor || {}
          const factoryAddressFull = [v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode]
            .map((p: string | null | undefined) => (p ?? "").trim())
            .filter(Boolean)
            .join(", ")

          setFormData(prev => ({
            ...prev,
            vendorCode: prev.vendorCode || v.vendorCode || "",
            categoryToInspect: prev.categoryToInspect || assignedCategories,
            factoryName: prev.factoryName || v.companyName || "",
            contactPersonName: prev.contactPersonName || v.ownerName || "",
            contactPhoneNumber: prev.contactPhoneNumber || v.businessPhone || "",
            factoryAddress: prev.factoryAddress || factoryAddressFull,
            gstTaxId: prev.gstTaxId || v.gstNumber || "",
            businessRegistrationNumber: prev.businessRegistrationNumber || v.businessRegistrationNumber || "",
            factoryLicenseNumber: prev.factoryLicenseNumber || v.tradeLicenseNumber || "",
          }))

          // Lock-state snapshot: true only where the vendor (or admin, for
          // categoryToInspect) supplied a value. Fields left empty here stay
          // editable for the entire session, regardless of what the checker
          // types later.
          const isNonEmpty = (s?: string | null) => typeof s === "string" && s.trim() !== ""
          setAutofillSnapshot({
            factoryName: isNonEmpty(v.companyName),
            contactPersonName: isNonEmpty(v.ownerName),
            contactPhoneNumber: isNonEmpty(v.businessPhone),
            factoryAddress: isNonEmpty(factoryAddressFull),
            gstTaxId: isNonEmpty(v.gstNumber),
            businessRegistrationNumber: isNonEmpty(v.businessRegistrationNumber),
            factoryLicenseNumber: isNonEmpty(v.tradeLicenseNumber),
            categoryToInspect: isNonEmpty(assignedCategories),
          })

          // Mark prefill complete so subsequent effect re-runs short-circuit.
          // Set before auto-start so the SCHEDULED → IN_PROGRESS request is also one-shot.
          prefilledForVendorIdRef.current = vendorId

          // Fire-and-forget: do not block first paint on the SCHEDULED → IN_PROGRESS transition.
          // 400 = backend rejected because already started — benign. Other codes = surface to user.
          if (inspection.status === "SCHEDULED") {
            qcCheckerService.startInspection(inspection.id).catch((startErr: any) => {
              if (cancelled) return
              if (startErr?.status !== 400) {
                console.error("Auto-start failed:", startErr)
                showErrorToast(
                  "Could not start inspection",
                  startErr?.message || "Please refresh the page and try again."
                )
              }
            })
          }
        }
      } catch (err) {
        if (!cancelled) console.error("Failed to load active inspection for form", err)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadActiveInspection()
    return () => { cancelled = true }
  }, [vendorName, vendorId])

  const steps: { id: Step; label: string; description: string; pdfSection: string }[] = [
    { id: "factoryDetails", label: "Factory Details", description: "Vendor and factory context", pdfSection: "Section 1" },
    { id: "legalRegistration", label: "Legal & Reg", description: "Business and tax info", pdfSection: "Section 2" },
    { id: "productionInfo", label: "Production Info", description: "Capacity and workforce", pdfSection: "Section 3" },
    { id: "basicInfrastructure", label: "Infrastructure", description: "Facilities availability", pdfSection: "Section 4" },
    { id: "qualitySafety", label: "Quality & Safety", description: "Processes and environment", pdfSection: "Section 5" },
    { id: "inspectionInfo", label: "Inspection Info", description: "Status and remarks", pdfSection: "Section 6" },
    { id: "basicEvidence", label: "Basic Evidence", description: "Photos and documents", pdfSection: "Section 7" },
  ]

  const getStepIndex = (step: Step) => steps.findIndex((s) => s.id === step)
  const currentStepIndex = getStepIndex(currentStep)

  const validateCurrentStep = (): StepErrors => {
    const stepErrors = validateStep(currentStep, formData)
    setErrors(prev => ({ ...prev, [currentStep]: stepErrors }))
    return stepErrors
  }

  const goToNextStep = () => {
    const stepErrors = validateCurrentStep()
    if (hasErrors(stepErrors)) {
      showErrorToast("Please fix the errors", "Some required fields are missing or invalid.")
      // Scroll to top so the first error is visible.
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id)
    }
  }

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id)
    }
  }

  // Jump directly to a step via the circle. Validate the step being left so the
  // user sees errors if they were skipping past required fields.
  const goToStep = (target: Step) => {
    if (target === currentStep) return
    // Re-validate current step; don't block navigation, just surface errors.
    setErrors(prev => ({ ...prev, [currentStep]: validateStep(currentStep, formData) }))
    setCurrentStep(target)
  }

  const currentStepErrors = errors[currentStep]

  const renderStepContent = () => {
    switch (currentStep) {
      case "factoryDetails":
        return <FactoryDetails formData={formData} setFormData={setFormData} errors={currentStepErrors} autofillSnapshot={autofillSnapshot} />
      case "legalRegistration":
        return <LegalRegistration formData={formData} setFormData={setFormData} errors={currentStepErrors} autofillSnapshot={autofillSnapshot} />
      case "productionInfo":
        return <ProductionInfo formData={formData} setFormData={setFormData} errors={currentStepErrors} autofillSnapshot={autofillSnapshot} />
      case "basicInfrastructure":
        return <BasicInfrastructure formData={formData} setFormData={setFormData} />
      case "qualitySafety":
        return <QualitySafety formData={formData} setFormData={setFormData} />
      case "inspectionInfo":
        return <InspectionInfo formData={formData} setFormData={setFormData} errors={currentStepErrors} />
      case "basicEvidence":
        return <BasicEvidence formData={formData} setFormData={setFormData} errors={currentStepErrors} />
      default:
        return null
    }
  }


  const handleComplete = async () => {
    if (!inspectionId) {
      showErrorToast("Cannot Submit", "No active inspection found. Please contact your administrator.")
      return;
    }

    // Run every step's validator. If anything fails, surface all errors and
    // jump the user to the first invalid step so they can see what's wrong.
    const all = validateAll(formData)
    if (Object.keys(all).length > 0) {
      setErrors(all)
      const firstInvalid = steps.find(s => all[s.id])?.id
      if (firstInvalid) setCurrentStep(firstInvalid)
      showErrorToast(
        "Cannot submit yet",
        "Some required fields are missing or invalid. Please review highlighted steps."
      )
      window.scrollTo({ top: 0, behavior: "smooth" })
      return
    }

    try {
      setSubmitting(true);

      // BasicEvidence already converts files to base64 on pick.
      // Here we just strip the raw File objects so the payload is clean JSON.
      const cleanPhotos = (formData.factoryPhotos || []).map((p: any) => ({
        name: p.name,
        data: p.data || null,
      }))
      const cleanDocs = (formData.documentsUpload || []).map((d: any) => ({
        name: d.name,
        data: d.data || null,
      }))

      const payload = {
        ...formData,
        factoryPhotos: cleanPhotos,
        documentsUpload: cleanDocs,
      }

      const res = await qcCheckerService.completeInspection(inspectionId, payload);
      if (res.success) {
        // Defensive reset: even though the parent will unmount this form in
        // 1.5s, clearing the id + autofill ref now means the form cannot
        // resubmit the same inspection if anything delays the unmount.
        setInspectionId(null);
        prefilledForVendorIdRef.current = null;
        showSuccessToast("Inspection Submitted! ✅", "Factory inspection report has been submitted successfully.");
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        showErrorToast("Submission Failed", "Could not submit the inspection. Please try again.");
      }
    } catch (err: any) {
      console.error("Error submitting inspection form:", err);
      // If the backend returned field-level validation errors, fan them out
      // to the relevant steps so the checker can see what's wrong.
      const fieldErrors: Record<string, string> | undefined = err?.fieldErrors || err?.response?.data?.fieldErrors;
      if (fieldErrors && typeof fieldErrors === "object") {
        const grouped = groupFieldErrors(fieldErrors)
        setErrors(grouped)
        const firstInvalid = steps.find(s => grouped[s.id])?.id
        if (firstInvalid) setCurrentStep(firstInvalid)
        showErrorToast("Server validation failed", "Please review highlighted fields.");
      } else {
        showErrorToast("Submission Error", err?.message || "An unexpected error occurred.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl text-slate-600 font-semibold">Loading assignment details...</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen font-sans bg-linear-to-br from-slate-50 to-blue-50/30">
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={onComplete}
              className="p-2 hover:bg-white rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-slate-600" />
            </button>
            <div>
              <h1 className="text-4xl font-bold text-slate-900">Factory Inspection</h1>
              <p className="text-slate-600 text-lg">{vendorName}</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8 overflow-x-auto">
          {/* Progress Bar */}
          <div className="relative mb-8 min-w-[700px]">
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
                          ? "bg-linear-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg"
                          : index === currentStepIndex
                            ? "bg-linear-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg ring-4 ring-blue-100"
                            : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"
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
                className="h-full bg-linear-to-r from-blue-600 to-blue-700 transition-all duration-500 ease-out"
                style={{
                  width: `${(currentStepIndex / (steps.length - 1)) * 100}%`
                }}
              />
            </div>
          </div>

          {/* Current Step Info */}
          <div className="text-center bg-slate-50 rounded-xl p-6">
            <div className="flex items-center justify-center gap-2 mb-2">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              <p className="text-slate-600 text-sm font-medium">
                Step {currentStepIndex + 1} of {steps.length}
              </p>
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
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
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 ${currentStepIndex === 0
              ? "bg-slate-100 text-slate-400 cursor-not-allowed"
              : "bg-white border border-slate-300 text-slate-700 hover:bg-slate-50"
              }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStepIndex === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-3 bg-linear-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Check className="w-5 h-5" />
              {submitting ? "Submitting..." : "Complete Factory Inspection"}
            </button>
          ) : (
            <button
              onClick={goToNextStep}
              className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              Next
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}