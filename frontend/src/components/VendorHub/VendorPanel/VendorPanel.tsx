"use client";

import { useState, useEffect, useRef } from "react";
import CompanyDetails from "../CompanyDetails/CompanyDetails";
import WarehouseDetails from "../WarehouseDetails/WarehouseDetails";
import OwnerProfile from "../OwnerProfile/OwnerProfile";
import VendorTypeProducts from "../VendorTypeProducts/VendorTypeProducts";
import ManufacturingFacilities from "../ManufacturingFacilities/ManufacturingFacilities";
import CertificationsLogistics from "../CertificationsLogistics/CertificationsLogistics";
import ContactTradeInfo from "../ContactTradeInfo/ContactTradeInfo";
import ReviewSubmit from "../ReviewSubmit/ReviewSubmit";
import { CenterNoticeHost } from "@/components/UI/CenterNotice";
// import ReviewSubmit from '../ReviewSubmit/ReviewSubmit'; // Temporarily commented out

const steps = [
  "Company Details",            // 0
  "Warehouse",                  // 1
  "Owner Profile",              // 2
  "Vendor Type & Products",     // 3
  "Manufacturing Facilities",   // 4 — skipped at nav-time when non-manufacturer
  "Certifications & Quality Control", // 5
  "Contact & Trade Info",       // 6
  "Review & Submit",            // 7
];

const MANUFACTURING_STEP_INDEX = 4;

// Review & Submit renders each step's data as a section whose card is
// `[aria-labelledby="section-<id>-title"]`. Maps a wizard step index to that
// section id so, after editing a section from Review, we can scroll back to it
// instead of jumping to the top.
const STEP_TO_REVIEW_SECTION: Record<number, string> = {
  0: "company",
  1: "warehouse",
  2: "owner",
  3: "vendor",
  4: "manufacturing",
  5: "certifications",
  6: "contact",
};

interface FormData {
  vendorType?: string | string[];
  [key: string]: any;
}

export default function VendorPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const [isEditingFromReview, setIsEditingFromReview] = useState(false);
  // When the user edits a section from Review & Submit and saves, we return to
  // Review and scroll back to THAT section instead of the top. Holds the
  // section id to scroll to on the next render of the Review step.
  const reviewScrollSectionRef = useRef<string | null>(null);

  // Whenever the active step changes (Next / Back / sidebar jump), scroll the
  // viewport back to the top so each step opens at its heading instead of
  // retaining the previous step's scroll position (which landed mid/bottom).
  // The new step renders taller content (maps, image grids) that reflows AFTER
  // the effect fires, so we run the scroll across two animation frames to win
  // against late layout shifts / scroll-anchoring.
  useEffect(() => {
    if (typeof window === "undefined") return;

    // Returning to Review after a section edit → scroll to that section, not top.
    const targetSection = reviewScrollSectionRef.current;
    if (targetSection && currentStep === steps.length - 1) {
      reviewScrollSectionRef.current = null;
      const toSection = () => {
        const el = document.querySelector(`[aria-labelledby="section-${targetSection}-title"]`);
        if (el) el.scrollIntoView({ behavior: "auto", block: "start" });
      };
      // Run across frames so the just-rendered Review content has settled.
      const r1 = requestAnimationFrame(() => {
        toSection();
        requestAnimationFrame(toSection);
      });
      return () => cancelAnimationFrame(r1);
    }

    const toTop = () => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      // Fallbacks for browsers where the scrolling root is the element.
      if (document.scrollingElement) document.scrollingElement.scrollTop = 0;
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    };
    toTop();
    const raf1 = requestAnimationFrame(() => {
      toTop();
      requestAnimationFrame(toTop);
    });
    return () => cancelAnimationFrame(raf1);
  }, [currentStep]);

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
      // Remember which section to land on when Review re-renders.
      reviewScrollSectionRef.current = STEP_TO_REVIEW_SECTION[currentStep] ?? null;
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
      reviewScrollSectionRef.current = STEP_TO_REVIEW_SECTION[currentStep] ?? null;
      setCurrentStep(steps.length - 1);
      setIsEditingFromReview(false);
      return;
    }

    if (currentStep > 0) {
      setCurrentStep(findAdjacent(currentStep, -1));
    }
  };

  const goToStep = (step: number, fromReviewEdit: boolean = false) => {
    // Steps that don't apply to this vendor (e.g. based on business type) stay
    // unreachable, but every other step is freely navigable so users can
    // preview/review and enter data in any order.
    if (isStepSkipped(step)) return;

    setIsEditingFromReview(fromReviewEdit);
    setCurrentStep(step);
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

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-100 to-slate-100 font-sans">
      {/* Center-screen success/error/warning/info notices for the registration flow */}
      <CenterNoticeHost />
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
          <nav aria-label="Registration steps" className="flex-1 min-h-0 overflow-y-auto px-4 py-6 scrollbar-thin">
            <ul className="space-y-1 relative" role="list">
              {steps.map((step, index) => {
                const skipped = isStepSkipped(index);
                const isCompleted = completedSteps.includes(index) && !skipped;
                const isCurrent = index === currentStep && !skipped;
                // Every non-skipped step is freely navigable — no locking of
                // upcoming steps.
                const isAccessible = !skipped;

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

        </aside>

        {/* Right Content Area (responsive width) */}
        <div className="flex-1 w-full min-w-0 overflow-y-auto relative">
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
                <div className="flex gap-1.5">
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

