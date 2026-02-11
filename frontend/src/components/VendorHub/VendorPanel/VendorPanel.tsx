'use client';

import { useState } from 'react';
import CompanyDetails from '../CompanyDetails/CompanyDetails';
import WarehouseDetails from '../WarehouseDetails/WarehouseDetails';
import OwnerProfile from '../OwnerProfile/OwnerProfile';
import VendorTypeProducts from '../VendorTypeProducts/VendorTypeProducts';
import ManufacturingFacilities from '../ManufacturingFacilities/ManufacturingFacilities';
import CertificationsLogistics from '../CertificationsLogistics/CertificationsLogistics';
import ContactTradeInfo from '../ContactTradeInfo/ContactTradeInfo';
import ReviewSubmit from '../ReviewSubmit/ReviewSubmit';
// import ReviewSubmit from '../ReviewSubmit/ReviewSubmit'; // Temporarily commented out

const baseSteps = [
  'Company Details',
  'Warehouse',
  'Owner Profile',
  'Vendor Type & Products',
  'Manufacturing Facilities', // This will be conditionally included
  'Certifications & Logistics',
  'Contact & Trade Info',
  'Review & Submit'
];

interface FormData {
  vendorType?: string | string[];
  [key: string]: any;
}

export default function VendorPanel() {
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);

  // Check if Manufacturing Facilities step should be included
  const isManufacturer = () => {
    const vendorTypes = formData.vendorType || [];
    return Array.isArray(vendorTypes) ? vendorTypes.includes('manufacturer') : vendorTypes === 'manufacturer';
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
    setFormData(prev => ({ ...prev, ...stepData }));
  };

  const markStepAsCompleted = (step: number) => {
    if (!completedSteps.includes(step)) {
      setCompletedSteps(prev => [...prev, step]);
    }
  };

  const nextStep = () => {
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
    if (currentStep > 0) {
      // Special handling when moving back from Certifications & Logistics
      if (currentStep === 4 && !isManufacturer()) {
        setCurrentStep(3); // Go back to Vendor Type & Products (skip Manufacturing Facilities)
      } else {
        setCurrentStep(currentStep - 1);
      }
    }
  };

  const goToStep = (step: number) => {
    // Only allow going to completed steps or the next immediate step
    if (step <= currentStep || completedSteps.includes(step - 1)) {
      setCurrentStep(step);
    } else {
      // Show alert that previous steps must be completed
      alert('Please complete the previous steps before proceeding to this step.');
    }
  };

  const renderStep = () => {
    const actualStepIndex = getActualStepIndex(currentStep);
    
    switch (actualStepIndex) {
      case 0:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />;
      case 1:
        return <WarehouseDetails onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 2:
        return <OwnerProfile onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 3:
        return <VendorTypeProducts onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 4:
        return <ManufacturingFacilities onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 5:
        return <CertificationsLogistics onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 6:
        return <ContactTradeInfo onNext={nextStep} onPrev={prevStep} onUpdateData={updateFormData} data={formData} />;
      case 7:
        return <ReviewSubmit onPrev={prevStep} onGoToStep={(step) => goToStep(getLogicalStepIndex(step))} data={formData} />;
      default:
        return <CompanyDetails onNext={nextStep} onUpdateData={updateFormData} data={formData} />;
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-gray-100 to-slate-100 font-sans">
      <div className="flex h-full">
        {/* Left Sidebar - Progress Steps (20% width) */}
        <div className="w-1/5 bg-white shadow-lg border-r border-gray-200">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-6">Registration Progress</h2>
            <div className="space-y-4">
              {steps.map((step, index) => {
                const isCompleted = completedSteps.includes(index);
                const isCurrent = index === currentStep;
                const isAccessible = index <= currentStep || isCompleted || (index > 0 && completedSteps.includes(index - 1));
                
                return (
                  <div
                    key={index}
                    className={`flex items-center space-x-3 p-3 rounded-lg transition-all duration-200 ${
                      isCurrent
                        ? 'bg-gray-200 border-r-6 border-[#3d3d3d]'
                        : isCompleted
                        ? 'bg-green-50 hover:bg-green-100 cursor-pointer'
                        : isAccessible
                        ? 'hover:bg-gray-50 cursor-pointer'
                        : 'opacity-50 cursor-not-allowed'
                    }`}
                    onClick={() => isAccessible && goToStep(index)}
                  >
                    {/* Step Number/Icon */}
                    <div
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                        isCurrent
                          ? 'bg-[#313131] text-white'
                          : isCompleted
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isCompleted ? (
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      ) : (
                        index + 1
                      )}
                    </div>
                    
                    {/* Step Title */}
                    <div className="flex-1">
                      <p
                        className={`text-base font-bold ${
                          isCurrent
                            ? 'text-[#313131]'
                            : isCompleted
                            ? 'text-green-900'
                            : 'text-gray-600'
                        }`}
                      >
                        {step}
                      </p>
                      {isCurrent && (
                        <p className="text-sm text-[#313131] mt-1">Current Step</p>
                      )}
                      {isCompleted && (
                        <p className="text-sm text-green-600 mt-1">Completed</p>
                      )}
                      {!isAccessible && !isCurrent && !isCompleted && (
                        <p className="text-sm text-gray-400 mt-1">Locked</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Progress Summary */}
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {Math.round(((currentStep) / (steps.length - 1)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-gray-700 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${((currentStep) / (steps.length - 1)) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Content Area (80% width) */}
        <div className="flex-1 w-4/5">
          <div className="p-8">
            <div className="max-w-7xl mx-auto">
              {/* Step Header */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-4">
                  <div className="flex items-center justify-center w-10 h-10 bg-[#313131] text-white rounded-full font-semibold">
                    {currentStep + 1}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-gray-900">{steps[currentStep]}</h1>
                    <p className="text-gray-700">Step {currentStep + 1} of {steps.length}</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-1">
                  <div
                    className="bg-gray-700 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${((currentStep + 1) / steps.length) * 100}%` }}
                  ></div>
                </div>
              </div>

              {/* Step Content */}
              <div className="bg-white rounded-lg shadow-sm">
                {renderStep()}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}