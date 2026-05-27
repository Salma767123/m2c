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

const steps = [
  "Company Details",            // 0
  "Warehouse",                  // 1
  "Owner Profile",              // 2
  "Vendor Type & Products",     // 3
  "Manufacturing Facilities",   // 4 — skipped at nav-time when non-manufacturer
  "Certifications & Logistics", // 5
  "Contact & Trade Info",       // 6
  "Review & Submit",            // 7
];

const MANUFACTURING_STEP_INDEX = 4;

interface FormData {
  vendorType?: string | string[];
  [key: string]: any;
}

export default function VendorPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);

  const isManufacturer = () => {
    const vendorTypes = formData.vendorType || [];
    return Array.isArray(vendorTypes)
      ? vendorTypes.includes("manufacturer")
      : vendorTypes === "manufacturer";
  };

  // Manufacturing Facilities is only relevant once the vendor has committed
  // to a type on Step 4. Before then we keep the step "live" so the sidebar
  // shows a stable 8-step flow. After Step 4 is saved, non-manufacturers see
  // it marked N/A and nav skips over it.
  const isStepSkipped = (index: number) =>
    index === MANUFACTURING_STEP_INDEX &&
    completedSteps.includes(3) &&
    !isManufacturer();

  const findAdjacent = (from: number, dir: 1 | -1) => {
    let next = from + dir;
    while (next >= 0 && next < steps.length && isStepSkipped(next)) {
      next += dir;
    }
    return next;
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

    if (currentStep < steps.length - 1) {
      markStepAsCompleted(currentStep);
      setCurrentStep(findAdjacent(currentStep, 1));
    }
  };

  const prevStep = () => {
    if (isEditingFromReview) {
      setCurrentStep(steps.length - 1);
      setIsEditingFromReview(false);
      return;
    }

    if (currentStep > 0) {
      setCurrentStep(findAdjacent(currentStep, -1));
    }
  };

  const goToStep = (step: number, fromReviewEdit: boolean = false) => {
    if (isStepSkipped(step)) return;

    if (fromReviewEdit) {
      setIsEditingFromReview(true);
      setCurrentStep(step);
      return;
    }

    // Allow going to completed steps, the current step, or the next
    // immediately-available step. When the previous step is skipped, fall
    // back to the one before it so the flow doesn't get stuck.
    const previousLive = findAdjacent(step, -1);
    const canEnter =
      step <= currentStep ||
      completedSteps.includes(step - 1) ||
      (previousLive >= 0 && completedSteps.includes(previousLive));

    if (canEnter) {
      setIsEditingFromReview(false);
      setCurrentStep(step);
    } else {
      alert(
        "Please complete the previous steps before proceeding to this step.",
      );
    }
  };

  const renderStep = () => {
    switch (currentStep) {
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

  // Progress reflects work-in-progress, not just saved steps:
  //   - Skipped steps are excluded from both numerator and denominator.
  //   - The current (in-progress) step earns a partial credit so the bar
  //     moves as the vendor advances through the wizard, instead of sitting
  //     at 0% until they hit Save & Continue.
  const visibleStepCount = steps.filter((_, i) => !isStepSkipped(i)).length;
  const completedVisibleCount = completedSteps.filter(
    (i) => !isStepSkipped(i),
  ).length;
  const inProgressCredit =
    !isStepSkipped(currentStep) && !completedSteps.includes(currentStep)
      ? 0.4
      : 0;
  const progressPercent = Math.min(
    100,
    Math.round(
      ((completedVisibleCount + inProgressCredit) / visibleStepCount) * 100,
    ),
  );

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-100 to-slate-100 font-sans">
      <div className="flex min-h-screen">
        {/* Left Sidebar — semantic <aside> + <nav> (web-design #129: no <div> with onClick) */}
        <aside className="hidden md:flex flex-col w-68 bg-white border-r border-gray-100 sticky top-21.25 self-start h-[calc(100vh-85px)] shrink-0 z-(--z-sticky) shadow-[4px_0_24px_rgba(0,0,0,0.01)]">
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
                const skipped = isStepSkipped(index);
                const isCompleted = completedSteps.includes(index) && !skipped;
                const isCurrent = index === currentStep && !skipped;
                const isAccessible =
                  !skipped &&
                  (index <= currentStep ||
                    isCompleted ||
                    (index > 0 && completedSteps.includes(index - 1)));

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
                      aria-label={`Step ${index + 1}: ${step}${skipped ? ", not applicable" : isCompleted ? ", completed" : isCurrent ? ", current" : ""}`}
                      className={`flex items-start gap-3.5 p-2 rounded-xl w-full text-left transition-all duration-200 group relative
                        ${
                          skipped
                            ? "opacity-50 cursor-not-allowed"
                            : isCurrent
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
                        {skipped ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full border border-dashed border-gray-300 bg-gray-50 text-gray-400 text-xs font-medium">
                            &mdash;
                          </div>
                        ) : isCompleted ? (
                          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-success-500 text-white shadow-[0_0_0_4px_rgba(22,163,74,0.1)] transition-transform duration-200 group-hover:scale-105">
                            <svg
                              className="w-4 h-4 stroke-3"
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
                            skipped
                              ? "text-gray-400 line-through decoration-gray-300"
                              : isCurrent
                                ? "text-brand-700 font-bold"
                                : isCompleted
                                  ? "text-gray-700 group-hover:text-success-700"
                                  : "text-gray-500 group-hover:text-gray-900"
                          }`}
                        >
                          {step}
                        </p>
                        {skipped ? (
                          <span className="text-[10px] text-gray-400 mt-0.5">
                            Not applicable
                          </span>
                        ) : isCurrent ? (
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
                className="h-1.5 rounded-full bg-linear-to-r from-brand-500 to-brand-600 transition-[width] duration-500 ease-out shadow-[0_0_8px_rgba(224,26,27,0.15)]"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center mt-2.5">
              <span className="text-[10px] text-gray-400 font-medium tabular-nums">
                {completedVisibleCount} of {visibleStepCount} completed
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
          <div className="md:hidden sticky top-19.25 z-(--z-sticky) bg-white/95 backdrop-blur-md border-b border-gray-200/80 px-4 py-3.5 shadow-[0_2px_12px_rgba(0,0,0,0.02)] transition-all duration-300">
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
                  {steps.map((_, i) => {
                    const skipped = isStepSkipped(i);
                    return (
                      <div
                        key={i}
                        className={`h-1 flex-1 rounded-full transition-colors duration-300 ${
                          skipped ? "opacity-40" : ""
                        }`}
                        style={{
                          backgroundColor:
                            !skipped && completedSteps.includes(i)
                              ? "var(--color-success-500)"
                              : !skipped && i === currentStep
                                ? "var(--color-brand-500)"
                                : "var(--color-outline)",
                        }}
                      />
                    );
                  })}
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

