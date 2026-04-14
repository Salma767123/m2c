"use client"

import { useState, useEffect } from "react"
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

interface InspectionFormProps {
  vendorName: string
  vendorId?: string
  onComplete: () => void
}

type Step =
  | "factoryDetails"
  | "legalRegistration"
  | "productionInfo"
  | "basicInfrastructure"
  | "qualitySafety"
  | "inspectionInfo"
  | "basicEvidence"

export default function InspectionForm({ vendorName, vendorId, onComplete }: InspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("factoryDetails")
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [inspectionId, setInspectionId] = useState<string | null>(null)
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

  // Fetch inspection data and auto-start if SCHEDULED
  useEffect(() => {
    async function loadActiveInspection() {
      try {
        const [response, profile] = await Promise.all([
          qcCheckerService.getInspections(),
          qcCheckerService.getCheckerProfile().catch(() => null),
        ])

        if (profile?.data?.name) {
          setFormData(prev => ({ ...prev, inspectorName: profile.data.name }))
        }
        if (response.success && response.inspections) {
          // Find an active inspection for this vendor
          let inspection = response.inspections.find(
            (i: any) =>
              (vendorId ? i.vendorId === vendorId : i.vendor?.companyName === vendorName) &&
              (i.status === "IN_PROGRESS" || i.status === "SCHEDULED")
          )

          if (!inspection) {
            inspection = response.inspections.find(
              (i: any) =>
                (vendorId ? i.vendorId === vendorId : i.vendor?.companyName === vendorName)
            )
          }

          if (inspection) {
            setInspectionId(inspection.id)

            // Auto-start the inspection if it's still SCHEDULED.
            // 400 = backend rejected because already started elsewhere — benign, proceed.
            // Other codes (403/404/500) = real errors, surface to user.
            if (inspection.status === "SCHEDULED") {
              try {
                await qcCheckerService.startInspection(inspection.id)
              } catch (startErr: any) {
                if (startErr?.status !== 400) {
                  console.error("Auto-start failed:", startErr)
                  showErrorToast(
                    "Could not start inspection",
                    startErr?.message || "Please refresh the page and try again."
                  )
                }
              }
            }

            const assignedCategories = Array.isArray(inspection.itemsToInspect)
              ? inspection.itemsToInspect.map((i: any) => i.itemName).join(', ')
              : "";

            setFormData(prev => ({
              ...prev,
              factoryName: inspection.factoryName || prev.factoryName,
              categoryToInspect: assignedCategories || prev.categoryToInspect,
              vendorCode: inspection.vendor?.vendorCode || prev.vendorCode,
            }))
          }
        }
      } catch (err) {
        console.error("Failed to load active inspection for form", err)
      } finally {
        setLoading(false)
      }
    }
    loadActiveInspection()
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

  const goToNextStep = () => {
    if (currentStepIndex < steps.length - 1) {
      setCurrentStep(steps[currentStepIndex + 1].id)
    }
  }

  const goToPrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStep(steps[currentStepIndex - 1].id)
    }
  }

  const renderStepContent = () => {
    switch (currentStep) {
      case "factoryDetails":
        return <FactoryDetails formData={formData} setFormData={setFormData} />
      case "legalRegistration":
        return <LegalRegistration formData={formData} setFormData={setFormData} />
      case "productionInfo":
        return <ProductionInfo formData={formData} setFormData={setFormData} />
      case "basicInfrastructure":
        return <BasicInfrastructure formData={formData} setFormData={setFormData} />
      case "qualitySafety":
        return <QualitySafety formData={formData} setFormData={setFormData} />
      case "inspectionInfo":
        return <InspectionInfo formData={formData} setFormData={setFormData} />
      case "basicEvidence":
        return <BasicEvidence formData={formData} setFormData={setFormData} />
      default:
        return null
    }
  }


  const handleComplete = async () => {
    if (!inspectionId) {
      showErrorToast("Cannot Submit", "No active inspection found. Please contact your administrator.")
      return;
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
        showSuccessToast("Inspection Submitted! ✅", "Factory inspection report has been submitted successfully.");
        setTimeout(() => {
          onComplete();
        }, 1500);
      } else {
        showErrorToast("Submission Failed", "Could not submit the inspection. Please try again.");
      }
    } catch (err: any) {
      console.error("Error submitting inspection form:", err);
      showErrorToast("Submission Error", err?.message || "An unexpected error occurred.");
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
              {steps.map((step, index) => (
                <div key={step.id} className="flex flex-col items-center relative z-10 flex-1">
                  {/* Step Circle */}
                  <div
                    className={`w-12 h-12 rounded-full flex items-center justify-center font-bold transition-all duration-300 cursor-pointer text-sm border-2 ${index < currentStepIndex
                      ? "bg-linear-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg"
                      : index === currentStepIndex
                        ? "bg-linear-to-r from-blue-600 to-blue-700 text-white border-blue-600 shadow-lg ring-4 ring-blue-100"
                        : "bg-white border-slate-300 text-slate-500 hover:border-slate-400"
                      }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    {index < currentStepIndex ? <Check className="w-5 h-5" /> : index + 1}
                  </div>

                  {/* Step Label */}
                  <div className="mt-3 text-center max-w-24">
                    <p
                      className={`text-xs font-medium leading-tight ${index <= currentStepIndex ? "text-slate-900" : "text-slate-500"
                        }`}
                    >
                      {step.label}
                    </p>
                  </div>
                </div>
              ))}
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