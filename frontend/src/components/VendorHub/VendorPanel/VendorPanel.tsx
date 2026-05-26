"use client";

import { useState } from "react";
import CompanyDetails from "../CompanyDetails/CompanyDetails";
import WarehouseDetails from "../WarehouseDetails/WarehouseDetails";
import OwnerProfile from "../OwnerProfile/OwnerProfile";
import VendorTypeProducts from "../VendorTypeProducts/VendorTypeProducts";
import ManufacturingFacilities from "../ManufacturingFacilities/ManufacturingFacilities";
import CertificationsLogistics from "../CertificationsLogistics/CertificationsLogistics";
import ContactTradeInfo from "../ContactTradeInfo/ContactTradeInfo";
import ReviewSubmit from "../ReviewSubmit/ReviewSubmit";
// import ReviewSubmit from '../ReviewSubmit/ReviewSubmit'; // Temporarily commented out

const baseSteps = [
  "Company Details",
  "Warehouse",
  "Owner Profile",
  "Vendor Type & Products",
  "Manufacturing Facilities", // This will be conditionally included
  "Certifications & Logistics",
  "Contact & Trade Info",
  "Review & Submit",
];

interface FormData {
  vendorType?: string | string[];
  [key: string]: any;
}

export default function VendorPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);

  // Check if Manufacturing Facilities step should be included
  const isManufacturer = () => {
    const vendorTypes = formData.vendorType || [];
    return Array.isArray(vendorTypes)
      ? vendorTypes.includes("manufacturer")
      : vendorTypes === "manufacturer";
  };

  // Generate dynamic steps based on vendor type
  const getSteps = () => {
    if (isManufacturer()) {
      return baseSteps; // Include all steps including Manufacturing Facilities
    } else {
      // Skip Manufacturing Facilities step
      return baseSteps.filter((_, index) => index !== 4);
    }
  };

  const steps = getSteps();

  // Map logical step to actual step index
  const getActualStepIndex = (logicalStep: number) => {
    if (isManufacturer()) {
      return logicalStep; // No mapping needed
    } else {
      // Skip Manufacturing Facilities (index 4)
      if (logicalStep >= 4) {
        return logicalStep + 1; // Add 1 to account for skipped step
      }
      return logicalStep;
    }
  };

  // Map actual step index to logical step
  const getLogicalStepIndex = (actualStep: number) => {
    if (isManufacturer()) {
      return actualStep; // No mapping needed
    } else {
      // Skip Manufacturing Facilities (index 4)
      if (actualStep > 4) {
        return actualStep - 1; // Subtract 1 to account for skipped step
      }
      return actualStep;
    }
  };

  const updateFormData = (stepData: Partial<FormData>) => {
    setFormData((prev) => ({ ...prev, ...stepData }));
  };

  const markStepAsCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps((prev) => [...prev, step]);
    }
  };

  const nextStep = () => {
    if (isEditingFromReview) {
      markStepAsCompleted(currentStep);
      setCurrentStep(steps.length - 1);
      setIsEditingFromReview(false);
      return;
    }

    const maxStep = steps.length - 1;
    if (currentStep < maxStep) {
      // Mark current step as completed
      markStepAsCompleted(currentStep);

      // Special handling when moving from Vendor Type & Products step
      if (currentStep === 3) {
        // If not a manufacturer, skip Manufacturing Facilities
        if (!isManufacturer()) {
          setCurrentStep(4); // Go directly to Certifications & Logistics (logical step 4, which maps to actual step 5)
        } else {
          setCurrentStep(currentStep + 1); // Go to Manufacturing Facilities
        }
      } else {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const prevStep = () => {
    if (isEditingFromReview) {
      setCurrentStep(steps.length - 1);
      setIsEditingFromReview(false);
      return;
    }

    if (currentStep > 0) {
      // Special handling when moving back from Certifications & Logistics
      if (currentStep === 4 && !isManufacturer()) {
        setCurrentStep(3); // Go back to Vendor Type & Products (skip Manufacturing Facilities)
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const goToStep = (step: number, fromReviewEdit: boolean = false) => {
    if (fromReviewEdit) {
      setIsEditingFromReview(true);
      setCurrentStep(step);
      return;
    }

    // Only allow going to completed steps or the next immediate step
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setIsEditingFromReview(false);
      setCurrentStep(step);
    } else {
      // Show alert that previous steps must be completed
      alert(
        "Please complete the previous steps before proceeding to this step.",
      );
    }
  };

  const renderStep = () => {
    const actualStepIndex = getActualStepIndex(currentStep);

    switch (actualStepIndex) {
      case 0:
        return (
          <CompanyDetails
            onNext={nextStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 1:
        return (
          <WarehouseDetails
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 2:
        return (
          <OwnerProfile
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 3:
        return (
          <VendorTypeProducts
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 4:
        return (
          <ManufacturingFacilities
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 5:
        return (
          <CertificationsLogistics
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 6:
        return (
          <ContactTradeInfo
            onNext={nextStep}
            onPrev={prevStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
      case 7:
        return (
          <ReviewSubmit
            onPrev={prevStep}
            onGoToStep={(step) => goToStep(step, true)}
            data={formData}
          />
        );
      default:
        return (
          <CompanyDetails
            onNext={nextStep}
            onUpdateData={updateFormData}
            data={formData}
          />
        );
    }
  };

  const progressPercent = Math.round(
    (completedSteps.length / steps.length) * 100,
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-100 to-slate-100 font-sans">
      <div className="flex min-h-screen">
        {/* Left Sidebar — semantic <aside> + <nav> (web-design #129: no <div> with onClick) */}
        <aside className="hidden md:flex flex-col w-68 bg-white border-r border-gray-100 sticky top-21.25 self-start h-[calc(100vh-85px)] shrink-0 z-[var(--z-sticky)] shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
          {/* Header */}
          <div className="px-6 py-6 border-b border-gray-100 shrink-0">
            <h2 className="text-xs font-bold text-gray-900 tracking-widest uppercase">
              Registration Progress
            </h2>
            <p className="text-[11px] text-gray-400 font-medium mt-1">
              Complete all steps to proceed
            </p>
          </div>

          {/* Navigation Steps */}
          <nav aria-label="Registration steps" className="flex-1 overflow-y-auto px-4 py-6 scrollbar-thin">
            <ul className="space-y-1 relative" role="list">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                const isAccessible =
                  index <= currentStep ||
                  isCompleted ||
                  (index > 0 && completedSteps.includes(index - 1));

                return (
                  <li key={index} className="relative flex items-start gap-4 pb-6 last:pb-0">
                    {/* Vertical Connector Line */}
                    {index < steps.length - 1 && (
                      <div
                        className="absolute left-6 top-8 bottom-0 w-0.5 -ml-px transition-colors duration-300"
                        style={{
                          backgroundColor: isCompleted ? "var(--color-success-500)" : "var(--color-outline)",
                        }}
                      />
                    )}

                    {/* Button */}
                    <button
                      type="button"
                      disabled={!isAccessible}
                      onClick={() => isAccessible && goToStep(index)}
                      aria-current={isCurrent ? "step" : undefined}
                      aria-label={`Step ${index + 1}: ${step}${isCompleted ? ", completed" : isCurrent ? ", current" : ""}`}
                      className={`flex items-start gap-3.5 p-2 rounded-xl w-full text-left transition-all duration-200 group relative
                        ${
                          isCurrent
                            ? "bg-brand-50/50"
                            : isAccessible && !isCompleted
                              ? "hover:bg-gray-50/60 cursor-pointer"
                              : isCompleted
                                ? "hover:bg-success-50/30 cursor-pointer"
                                : "opacity-60 cursor-not-allowed"
                        }`}
                    >
                      {/* Step Indicator Dot */}
                      <div className="relative shrink-0 z-10 flex items-center justify-center w-8 h-8">
                        {isCompleted ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success-500 text-white shadow-[0_0_0_4px_rgba(22,163,74,0.1)] transition-transform duration-200 group-hover:scale-105">
                            <svg
                              className="w-4 h-4 stroke-[3]"
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                              />
                            </svg>
                          </div>
                        ) : isCurrent ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-brand-500 bg-white shadow-[0_0_0_4px_rgba(224,26,27,0.12)]">
                            <span className="w-2.5 h-2.5 rounded-full bg-brand-500 animate-pulse" />
                          </div>
                        ) : isAccessible ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-300 bg-white text-gray-600 text-xs font-semibold group-hover:border-brand-400 group-hover:text-brand-500 transition-colors duration-150">
                            {index + 1}
                          </div>
                        ) : (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-gray-200 bg-gray-50 text-gray-400 text-xs font-medium">
                            {index + 1}
                          </div>
                        )}
                      </div>

                      {/* Text */}
                      <div className="flex-1 min-w-0 pt-0.5">
                        <p
                          className={`text-sm font-semibold leading-tight truncate transition-colors duration-150 ${
                            isCurrent
                              ? "text-brand-700 font-bold"
                              : isCompleted
                                ? "text-gray-700 group-hover:text-success-700"
                                : "text-gray-500 group-hover:text-gray-900"
                          }`}
                        >
                          {step}
                        </p>
                        {isCurrent ? (
                          <span className="text-[10px] text-brand-600 font-bold tracking-wide uppercase mt-0.5 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-brand-500" />
                            In Progress
                          </span>
                        ) : isCompleted ? (
                          <span className="text-[10px] text-success-500 font-medium tracking-wide uppercase mt-0.5 flex items-center gap-1">
                            Completed
                          </span>
                        ) : isAccessible ? (
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            Available
                          </span>
                        ) : (
                          <span className="text-[10px] text-gray-300 mt-0.5">
                            Locked
                          </span>
                        )}
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </nav>

          {/* Progress Summary Pinned to Bottom */}
          <div className="p-5 border-t border-gray-100 shrink-0 bg-gray-50/50">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">
                Overall Progress
              </span>
              <span className="text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-full tabular-nums">
                {progressPercent}%
              </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-1.5 rounded-full bg-gradient-to-r from-brand-500 to-brand-600 transition-[width] duration-500 ease-out shadow-[0_0_8px_rgba(224,26,27,0.15)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5">
              <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                {completedSteps.length} of {steps.length} completed
              </span>
              {progressPercent === 100 && (
                <span className="text-[10px] text-success-500 font-bold flex items-center gap-0.5 animate-bounce">
                  <svg className="w-3.5 h-3.5 fill-success-500" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Ready!
                </span>
              )}
            </div>
          </div>
        </aside>

        {/* Right Content Area (responsive width) */}
        <div className="flex-1 w-full min-w-0">
          {/* Mobile Sticky Progress Tracker */}
          <div className="md:hidden sticky top-[77px] z-[var(--z-sticky)] bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300">
            <div className="flex justify-between items-center gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex items-center justify-center w-8 h-8 bg-brand-500 text-white rounded-lg font-bold shrink-0 text-sm shadow-[0_3px_8px_rgba(224,26,27,0.15)]">
                  {currentStep + 1}
                </div>
                <div className="min-w-0">
                  <span className="text-[9px] font-bold text-brand-500 uppercase tracking-widest block leading-none mb-1">
                    Step {currentStep + 1} of {steps.length}
                  </span>
                  <h2 className="text-xs font-bold text-gray-900 truncate">
                    {steps[currentStep]}
                  </h2>
                </div>
              </div>
              <div className="flex items-center gap-2.5 shrink-0 bg-gray-50 border border-gray-100 rounded-lg px-2 py-1">
                <span className="text-[10px] font-bold text-gray-800 tabular-nums">
                  {progressPercent}%
                </span>
                <div className="w-12 bg-gray-200 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-brand-500 h-1 rounded-full transition-[width] duration-500 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto">
              {/* Step Header */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-brand-500 text-white rounded-lg font-semibold">
                    {currentStep + 1}
                  </div>
                  <div>
                    {/* text-wrap: balance prevents widows (web-design #44) */}
                    <h1
                      className="text-headline-md text-gray-900"
                      style={{ textWrap: "balance" as any }}
                    >
                      {steps[currentStep]}
                    </h1>
                    <p className="text-gray-500 text-sm mt-0.5 tabular-nums">
                      Step {currentStep + 1} of {steps.length}
                    </p>
                  </div>
                </div>
                {/* Segmented progress — per-step visual feedback */}
                <div
                  className="flex gap-1.5"
                  role="progressbar"
                  aria-valuenow={progressPercent}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {steps.map((_, i) => (
                    <div
                      key={i}
                      className="h-1 flex-1 rounded-full transition-colors duration-300"
                      style={{
                        backgroundColor: completedSteps.includes(i)
                          ? "var(--color-success-500)"
                          : i === currentStep
                            ? "var(--color-brand-500)"
                            : "var(--color-outline)",
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                {renderStep()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

