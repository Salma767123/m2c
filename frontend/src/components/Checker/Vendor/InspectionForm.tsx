"use client"

import { useState, useEffect } from "react"
import { Check, ArrowLeft, ArrowRight } from "lucide-react"
import GeneralInformation from "./Steps/GeneralInformation"
import Preparation from "./Steps/Preparation"
import Packaging from "./Steps/Packaging"
import Measurements from "./Steps/Measurements"
import Defects from "./Steps/Defects"
import Testing from "./Steps/Testing"
import Documentation from "./Steps/Documentation"
import Review from "./Steps/Review"


import qcCheckerService from "@/services/qcCheckerService"

interface InspectionFormProps {
  vendorName: string
  vendorId?: string
  onComplete: () => void
}

type Step = "general" | "prep" | "packaging" | "measurements" | "defects" | "testing" | "documentation" | "review"

export default function InspectionForm({ vendorName, vendorId, onComplete }: InspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>("general")
  const [loading, setLoading] = useState(true)
  const [formData, setFormData] = useState({
    // General Information
    client: "",
    vendor: vendorName,
    factory: "",
    serviceLocation: "",
    serviceStartDate: "",
    serviceType: "Pre-Shipment Inspection",

    // Preparation & Order Readiness
    items: [
      {
        id: 1,
        itemName: "Cotton T-Shirt",
        itemDescription: "100% Cotton Round Neck T-Shirt - Various Colors",
        totalQuantity: 2500,
        inspectionQuantity: 200,
        status: "Ready"
      },
      {
        id: 2,
        itemName: "Denim Jeans",
        itemDescription: "Blue Denim Straight Fit Jeans - Size 28-42",
        totalQuantity: 2500,
        inspectionQuantity: 200,
        status: "Pending"
      }
    ],
    packedQuantity: 5000,
    cartonCount: 50,
    warehousePhotoEvidences: [] as string[],

    // Packaging & Labeling Verification
    shipperCartonQuality: ["pass"] as string[],
    innerCartonPackaging: [] as string[],
    retailPackagingQuality: ["pass"] as string[],
    productTypeConformity: [] as string[],
    aqlWorkmanship: [] as string[],
    onSiteTests: [] as string[],
    labelingComplete: [] as string[],
    internalProtection: ["pass"] as string[],
    shipperCartonRemark: "",
    innerCartonRemark: "",
    retailPackagingRemark: "",
    productTypeRemark: "",
    aqlWorkmanshipRemark: "",
    onSiteTestsRemark: "",
    packagingPhotos: [] as string[],

    // Physical Measurement & Weight
    measurements: [
      {
        id: 1,
        sampleName: "S1",
        cartonLength: 45,
        cartonWidth: 30,
        cartonHeight: 25,
        productLength: 45,
        productWidth: 30,
        retailWeight: 0.5,
        cartonGrossWeight: 25,
      },
      {
        id: 2,
        sampleName: "S2",
        cartonLength: 45.1,
        cartonWidth: 30.1,
        cartonHeight: 25,
        productLength: 45.1,
        productWidth: 30.1,
        retailWeight: 0.51,
        cartonGrossWeight: 25.2,
      },
    ],
    measurementPhotos: [] as string[],

    // Workmanship & AQL Defects
    // AQL Configuration
    inspectionLevel: "L-II",
    sampleSize: 200,
    aqlCritical: 0,
    aqlMajor: 1.0,
    aqlMinor: 2.5,
    maxAllowedCritical: 0,
    maxAllowedMajor: 5,
    maxAllowedMinor: 10,
    // Defect Counts
    criticalDefects: 0,
    majorDefects: 0,
    minorDefects: 2,
    criticalDefectDetails: "" as string,
    majorDefectDetails: "" as string,
    minorDefectDetails: "" as string,
    defectPhotos: [] as string[],

    // On-Site Testing & Quality Checks
    dropTestResult: "pass",
    colorFastnessDry: "pass",
    colorFastnessWet: "pass",
    seamStrengthResult: "pass",
    smellCheck: "pass",
    tests: [
      {
        id: "drop",
        label: "Drop Test",
        detail: "",
        pass: true,
        fail: false,
        photos: [] as string[],
        rightPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
        wrongPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
      },
      {
        id: "colorFastness",
        label: "Color Fastness",
        detail: "",
        pass: true,
        fail: false,
        photos: [] as string[],
        rightPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
        wrongPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
      },
      {
        id: "seamStrength",
        label: "Seam Strength",
        detail: "",
        pass: true,
        fail: false,
        photos: [] as string[],
        rightPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
        wrongPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
      },
      {
        id: "smell",
        label: "Smell Check",
        detail: "",
        pass: true,
        fail: false,
        photos: [] as string[],
        rightPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
        wrongPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
      },
    ],
    testingPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],

    // Final Documentation
    inspectorSignature: "",
    documentationPhotos: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
    photocopyDocuments: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
    companyIdCards: [] as { file?: File; name: string; url: string; id: string | number; uploadedAt: string; uploadedDate: string; uploadedTime: string }[],
  })

  // Fetch true inspection data
  useEffect(() => {
    async function loadActiveInspection() {
      try {
        const response = await qcCheckerService.getInspections();
        if (response.success && response.inspections) {
          // Find an active inspection for this vendor
          const inspection = response.inspections.find(
            (i: any) =>
              (vendorId ? i.vendorId === vendorId : i.vendor?.companyName === vendorName) &&
              (i.status === "IN_PROGRESS" || i.status === "SCHEDULED")
          );

          if (inspection) {
            setFormData(prev => {
              const itemsToInspect = Array.isArray(inspection.itemsToInspect) ? inspection.itemsToInspect : [];
              return {
                ...prev,
                client: inspection.clientName || prev.client,
                serviceStartDate: inspection.scheduledDate || prev.serviceStartDate,
                items: itemsToInspect.map((item: any) => ({
                  id: item.id || Math.random(),
                  itemName: item.itemName || "",
                  itemDescription: item.description || item.specifications || "",
                  totalQuantity: Number(item.quantity) || 0,
                  inspectionQuantity: Number(item.inspectionQuantity) || 0,
                  status: "Pending"
                }))
              };
            });
          }
        }
      } catch (err) {
        console.error("Failed to load active inspection for form", err);
      } finally {
        setLoading(false);
      }
    }
    loadActiveInspection();
  }, [vendorName, vendorId]);

  // Steps ordered to match PDF report structure exactly
  const steps: { id: Step; label: string; description: string; pdfSection: string }[] = [
    { id: "general", label: "General Information", description: "Vendor and service details", pdfSection: "Section A" },
    { id: "prep", label: "Item Quantities", description: "Total amounts and readiness", pdfSection: "Section B" },
    { id: "packaging", label: "Packaging & Labeling", description: "Cartons, labels, and protection", pdfSection: "Section C (Items 1-4)" },
    { id: "measurements", label: "Measurements", description: "Dimensions and weight specs", pdfSection: "Spec Verification" },
    { id: "defects", label: "AQL Defects", description: "Workmanship and quality analysis", pdfSection: "Section E" },
    { id: "testing", label: "On-site Tests", description: "Durability and quality checks", pdfSection: "Section C (Item 6)" },
    { id: "documentation", label: "Documentation", description: "Final sign-off and packing list", pdfSection: "Final Documentation" },
    { id: "review", label: "Review & Submit", description: "Overall result and final confirmation", pdfSection: "Overall Result" },
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
      case "general":
        return <GeneralInformation formData={formData} setFormData={setFormData} />
      case "prep":
        return <Preparation formData={formData} setFormData={setFormData} />
      case "packaging":
        return <Packaging formData={formData} setFormData={setFormData} />
      case "measurements":
        return <Measurements formData={formData} setFormData={setFormData} />
      case "defects":
        return <Defects formData={formData} setFormData={setFormData} />
      case "testing":
        return <Testing formData={formData} setFormData={setFormData} />
      case "documentation":
        return <Documentation formData={formData} setFormData={setFormData} />
      case "review":
        return <Review formData={formData} />
      default:
        return null
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
      <div className="p-8 max-w-420 mx-auto">
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
              <h1 className="text-4xl font-bold text-slate-900">Quality Inspection</h1>
              <p className="text-slate-600 text-lg">{vendorName}</p>
            </div>
          </div>
        </div>

        {/* Step Indicator */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200/60 p-8 mb-8">
          {/* Progress Bar */}
          <div className="relative mb-8">
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
                    <p className={`text-xs font-medium leading-tight ${index <= currentStepIndex ? "text-slate-900" : "text-slate-500"
                      }`}>
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
                Step {currentStepIndex + 1} of {steps.length} • {steps[currentStepIndex].pdfSection}
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

          {currentStep === "review" ? (
            <button
              onClick={onComplete}
              className="flex items-center gap-2 px-6 py-3 bg-linear-to-r from-emerald-600 to-emerald-700 text-white font-semibold rounded-xl hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 shadow-md hover:shadow-lg"
            >
              <Check className="w-5 h-5" />
              Seal & Generate Report
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