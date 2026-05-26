'use client';

import { Check } from 'lucide-react';

interface ProgressBarProps {
  steps: string[];
  currentStep: number;
}

export default function ProgressBar({ steps, currentStep }: ProgressBarProps) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-6 font-sans">
      <div className="flex items-center justify-between">
        {steps.map((step, index) => (
          <div key={index} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 transition-colors ${
                  index < currentStep
                    ? 'bg-success-500 border-success-500 text-white'
                    : index === currentStep
                    ? 'bg-brand-50 border-brand-500 text-brand-500'
                    : 'bg-gray-100 border-gray-300 text-gray-400'
                }`}
              >
                {index < currentStep ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-lg font-medium">{index + 1}</span>
                )}
              </div>
              <div className="mt-2 text-center">
                <div
                  className={`text-base font-medium ${
                    index <= currentStep ? 'text-gray-900' : 'text-gray-500'
                  }`}
                >
                  {step}
                </div>
              </div>
            </div>
            {index < steps.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-4 ${
                  index < currentStep ? 'bg-success-500' : 'bg-gray-200'
                }`}
                style={{ minWidth: '40px' }}
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}