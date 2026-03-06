"use client"

import { useState, useEffect } from "react"
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

interface ProductInspectionFormProps {
    productId: string
    productName: string
    vendorName: string
    onComplete: () => void
    onCancel: () => void
}

type Step =
    | "generalInformation"
    | "preparation"
    | "measurements"
    | "packaging"
    | "defects"
    | "testing"
    | "documentation"
    | "review"

export default function ProductInspectionForm({
    productId,
    productName,
    vendorName,
    onComplete,
    onCancel,
}: ProductInspectionFormProps) {
    const [currentStep, setCurrentStep] = useState<Step>("generalInformation")
    const [submitting, setSubmitting] = useState(false)

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
            inspectionQuantity: 0,
            status: "Pending"
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

        // Testing
        tests: [] as any[],
        testingPhotos: [] as any[],

        // Documentation
        inspectorSignature: "",
        documentationPhotos: [] as any[],
        photocopyDocuments: [] as any[],
        companyIdCards: [] as any[],

        // Review / Final Decision
        finalDecision: "Approved", // Approved, Conditionally Approved, Rejected
        reviewerRemarks: ""
    })

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
        if (!isLastStep) {
            setCurrentStep(steps[currentStepIndex + 1].id)
        }
    }

    const prevStep = () => {
        if (currentStepIndex > 0) {
            setCurrentStep(steps[currentStepIndex - 1].id)
        }
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
        if (formData.finalDecision === "Rejected" && !formData.reviewerRemarks) {
            showErrorToast("Error", "Rejection remarks are required.")
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

            if (formData.finalDecision === "Approved" || formData.finalDecision === "Conditionally Approved") {
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

                            return (
                                <button
                                    key={step.id}
                                    onClick={() => setCurrentStep(step.id)}
                                    className={`flex items-center w-full p-3 rounded-xl transition-all duration-200 text-left ${isActive
                                        ? "bg-blue-50 text-blue-700"
                                        : isPast
                                            ? "text-slate-600 hover:bg-slate-50"
                                            : "text-slate-400 hover:bg-slate-50"
                                        }`}
                                >
                                    <div
                                        className={`flex items-center justify-center w-8 h-8 rounded-full mr-3 text-sm font-semibold transition-colors duration-200 ${isActive
                                            ? "bg-blue-100 text-blue-700 font-bold"
                                            : isPast
                                                ? "bg-green-100 text-green-600"
                                                : "bg-slate-100 text-slate-500"
                                            }`}
                                    >
                                        {isPast ? <Check className="w-4 h-4" /> : index + 1}
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
                            <GeneralInformation formData={formData} setFormData={setFormData} />
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
