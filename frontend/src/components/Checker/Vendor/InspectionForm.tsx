"use client"

import { useState, useEffect, useRef } from "react"
import { Check, ArrowLeft, ArrowRight, AlertTriangle } from "lucide-react"
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

// Read the checker's current GPS position. The backend geofences the start
// request against the vendor's factory, so coordinates are mandatory. Rejects
// with a user-friendly message when the browser can't (or isn't allowed to)
// provide a location.
function getCurrentCoords(): Promise<{ checkerLatitude: number; checkerLongitude: number }> {
  return new Promise((resolve, reject) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      reject(new Error("Location is not supported by this browser. Please use a device with GPS/location enabled."))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ checkerLatitude: pos.coords.latitude, checkerLongitude: pos.coords.longitude }),
      (err) => {
        const message =
          err.code === err.PERMISSION_DENIED
            ? "Location permission was denied. Please allow location access for this site and refresh the page to start the inspection."
            : err.code === err.POSITION_UNAVAILABLE
              ? "Your location could not be determined. Please check that location services are enabled and try again."
              : "Timed out while getting your location. Please try again."
        reject(new Error(message))
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    )
  })
}

type Step = ValidationStep

export default function InspectionForm({ vendorName, vendorId, onComplete }: InspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("factoryDetails")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inspectionId, setInspectionId] = useState<string | null>(null)
  const [cycleNumber, setCycleNumber] = useState(1)
  const [previousRejectionReason, setPreviousRejectionReason] = useState<string | null>(null)
  const [errors, setErrors] = useState<AllErrors>({})
  // Snapshot of which vendor-sourced fields had a value at autofill time.
  // Locked once, then used for readonly decisions across all steps — so typing
  // into a field that the vendor left empty can never silently re-lock it,
  // and the decision survives step unmount/remount during navigation.
  const [autofillSnapshot, setAutofillSnapshot] = useState<Record<string, boolean>>({})

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
      // Re-seed so we remain on the page while the user decides.
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
      // Ignore links rendered inside the form itself.
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
          if (inspection.cycleNumber > 1) setCycleNumber(inspection.cycleNumber)
          if (res.previousRejectionReason) setPreviousRejectionReason(res.previousRejectionReason)
          else if (inspection.rejectionReason) setPreviousRejectionReason(inspection.rejectionReason)

          const items = inspection.itemsToInspect
          const assignedCategories = Array.isArray(items)
            ? items.map((i: any) => i.itemName).join(', ')
            : ""

          // For re-inspections, itemsToInspect contains the previous inspection's
          // full form data (copied when admin raised re-inspection). Use it to
          // pre-fill all fields so the checker doesn't re-enter everything.
          const prevForm = (!Array.isArray(items) && items && typeof items === 'object') ? items as Record<string, any> : null

          // Prefill from vendor record + previous form data. All fields stay
          // editable — checker can correct discrepancies they see at the factory.
          const v = inspection.vendor || {}
          const factoryAddressFull = [v.factoryAddress, v.factoryCity, v.factoryState, v.factoryZipCode]
            .map((p: string | null | undefined) => (p ?? "").trim())
            .filter(Boolean)
            .join(", ")

          setFormData(prev => ({
            ...prev,
            vendorCode: prev.vendorCode || v.vendorCode || "",
            categoryToInspect: prev.categoryToInspect || (prevForm?.categoryToInspect) || assignedCategories,
            factoryName: prev.factoryName || (prevForm?.factoryName) || v.companyName || "",
            contactPersonName: prev.contactPersonName || (prevForm?.contactPersonName) || v.ownerName || "",
            contactPhoneNumber: prev.contactPhoneNumber || (prevForm?.contactPhoneNumber) || v.businessPhone || "",
            factoryAddress: prev.factoryAddress || (prevForm?.factoryAddress) || factoryAddressFull,
            gstTaxId: prev.gstTaxId || (prevForm?.gstTaxId) || v.gstNumber || "",
            businessRegistrationNumber: prev.businessRegistrationNumber || (prevForm?.businessRegistrationNumber) || v.businessRegistrationNumber || "",
            factoryLicenseNumber: prev.factoryLicenseNumber || (prevForm?.factoryLicenseNumber) || v.tradeLicenseNumber || "",
            // Production Info (only from previous form data)
            productsManufactured: prev.productsManufactured || (prevForm?.productsManufactured) || "",
            monthlyProductionCapacity: prev.monthlyProductionCapacity || (prevForm?.monthlyProductionCapacity) || "",
            numberOfProductionWorkers: prev.numberOfProductionWorkers || (prevForm?.numberOfProductionWorkers) || "",
            // Infrastructure (from previous form)
            machineryAvailable: prevForm?.machineryAvailable || prev.machineryAvailable,
            electricityAvailable: prevForm?.electricityAvailable || prev.electricityAvailable,
            waterAvailable: prevForm?.waterAvailable || prev.waterAvailable,
            storageAreaAvailable: prevForm?.storageAreaAvailable || prev.storageAreaAvailable,
            // Quality & Safety (from previous form)
            qualityCheckProcess: prevForm?.qualityCheckProcess || prev.qualityCheckProcess,
            safetyEquipment: prevForm?.safetyEquipment || prev.safetyEquipment,
            cleanWorkingEnvironment: prevForm?.cleanWorkingEnvironment || prev.cleanWorkingEnvironment,
          }))

          // Lock-state snapshot: true only where the vendor (or admin, for
          // categoryToInspect) supplied a value. Fields left empty here stay
          // editable for the entire session, regardless of what the checker
          // types later.
          const isNonEmpty = (s?: string | null) => typeof s === "string" && s.trim() !== ""
          setAutofillSnapshot({
            factoryName: isNonEmpty(prevForm?.factoryName || v.companyName),
            contactPersonName: isNonEmpty(prevForm?.contactPersonName || v.ownerName),
            contactPhoneNumber: isNonEmpty(prevForm?.contactPhoneNumber || v.businessPhone),
            factoryAddress: isNonEmpty(prevForm?.factoryAddress || factoryAddressFull),
            gstTaxId: isNonEmpty(prevForm?.gstTaxId || v.gstNumber),
            businessRegistrationNumber: isNonEmpty(prevForm?.businessRegistrationNumber || v.businessRegistrationNumber),
            factoryLicenseNumber: isNonEmpty(prevForm?.factoryLicenseNumber || v.tradeLicenseNumber),
            categoryToInspect: isNonEmpty(prevForm?.categoryToInspect || assignedCategories),
          })

          // Mark prefill complete so subsequent effect re-runs short-circuit.
          // Set before auto-start so the SCHEDULED → IN_PROGRESS request is also one-shot.
          prefilledForVendorIdRef.current = vendorId

          // Fire-and-forget: do not block first paint on the SCHEDULED → IN_PROGRESS transition.
          // The backend geofences the checker against the vendor factory, so we
          // must read the browser GPS and send it with the start request. If the
          // inspection is already IN_PROGRESS we skip this entirely.
          if (inspection.status === "SCHEDULED") {
            getCurrentCoords()
              .then((coords) => {
                if (cancelled) return
                return qcCheckerService.startInspection(inspection.id, coords)
              })
              .catch((startErr: any) => {
                if (cancelled) return
                // 400 with "already" = backend rejected because already started — benign.
                const msg: string = startErr?.message || ""
                if (startErr?.status === 400 && /already/i.test(msg)) return
                console.error("Auto-start failed:", startErr)
                showErrorToast(
                  "Could not start inspection",
                  startErr?.message || "Please enable location services and refresh the page."
                )
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
      // Here we just strip the raw File objects so the payload is clean JSON,
      // while preserving the named-slot metadata (slotId/label) so the admin
      // report renders a labelled photo grid.
      const cleanPhotos = (formData.factoryPhotos || []).map((p: any) => ({
        slotId: p.slotId || null,
        label: p.label || null,
        name: p.name,
        data: p.data || p.url || null,
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
        // Submission succeeded — disable the exit guard so the post-submit
        // redirect (and any cleanup navigation) isn't blocked by the modal.
        allowLeaveRef.current = true;
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
    <div ref={rootRef} className="min-h-screen font-sans bg-[#f7f7f5]">
      <div className="p-8 max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => requestExit(onComplete)}
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

        {/* Re-inspection Banner */}
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
          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex gap-4 justify-between">
          <button
            onClick={goToPrevStep}
            disabled={currentStepIndex === 0}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 border ${currentStepIndex === 0
              ? "border-slate-100 bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
              : "border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800"
              }`}
          >
            <ArrowLeft className="w-4 h-4" />
            Previous
          </button>

          {currentStepIndex === steps.length - 1 ? (
            <button
              onClick={handleComplete}
              disabled={submitting}
              className={`flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-semibold rounded-xl transition-colors duration-200 shadow-sm shadow-emerald-600/10 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${submitting ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              <Check className="w-5 h-5" />
              {submitting ? "Submitting..." : "Complete Factory Inspection"}
            </button>
          ) : (
            <button
              onClick={goToNextStep}
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