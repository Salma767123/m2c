import React, { useState } from 'react';
import { ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { ArrowLeft, ArrowRight, Check, ClipboardList } from 'lucide-react-native';
import { GeneralInformation } from './Steps/GeneralInformation';
import { Preparation } from './Steps/Preparation';
import { Packaging } from './Steps/Packaging';
import { Measurements } from './Steps/Measurements';
import { Defects } from './Steps/Defects';
import { Testing } from './Steps/Testing';
import { Documentation } from './Steps/Documentation';
import { Review } from './Steps/Review';

type StepId =
  | 'general'
  | 'prep'
  | 'packaging'
  | 'measurements'
  | 'defects'
  | 'testing'
  | 'documentation'
  | 'review';

type QualityInspectionFormProps = {
  vendorName: string;
  onComplete: () => void;
};

const steps: { id: StepId; label: string; description: string }[] = [
  {
    id: 'general',
    label: 'General Information',
    description: 'Vendor, client, factory and service details',
  },
  {
    id: 'prep',
    label: 'Order Status',
    description: 'PO details, items, packed quantity and warehouse readiness',
  },
  {
    id: 'packaging',
    label: 'Packaging & Labeling',
    description: 'Cartons, inner and retail packaging, labels and markings',
  },
  {
    id: 'measurements',
    label: 'Measurements',
    description: 'Carton dimensions, product size and weight verification',
  },
  {
    id: 'defects',
    label: 'AQL Defects',
    description: 'Workmanship defects, AQL levels and defect counts',
  },
  {
    id: 'testing',
    label: 'On-site Tests',
    description: 'Drop test, color fastness, seam strength, smell and other checks',
  },
  {
    id: 'documentation',
    label: 'Documentation',
    description: 'Photos, signatures and support documents for the report',
  },
  {
    id: 'review',
    label: 'Review & Submit',
    description: 'Overall result and final confirmation before sealing the report',
  },
];

export function QualityInspectionForm({ vendorName, onComplete }: QualityInspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<StepId>('general');

  const currentIndex = steps.findIndex((s) => s.id === currentStep);

  const goNext = () => {
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1].id);
    }
  };

  const goPrev = () => {
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1].id);
    }
  };

  const renderContent = () => {
    switch (currentStep) {
      case 'general':
        return <GeneralInformation />;
      case 'prep':
        return <Preparation />;
      case 'packaging':
        return <Packaging />;
      case 'measurements':
        return <Measurements />;
      case 'defects':
        return <Defects />;
      case 'testing':
        return <Testing />;
      case 'documentation':
        return <Documentation />;
      case 'review':
        return <Review />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white border-b border-gray-200 px-4 py-4">
        <View className="flex-row items-center">
          <TouchableOpacity onPress={onComplete} className="mr-3 rounded-full bg-gray-100 p-2">
            <ArrowLeft size={20} color="#374151" />
          </TouchableOpacity>
          <View className="flex-1">
            <Text className="text-lg font-bold text-gray-900">Quality Inspection</Text>
            <Text className="text-sm text-gray-500">{vendorName}</Text>
          </View>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Progress Card */}
        <View className="mx-4 mt-4 mb-3 rounded-2xl bg-white shadow-sm border border-gray-100">
          <View className="p-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between">
              <View className="flex-row items-center">
                <View className="bg-gray-50 rounded-full p-2 mr-3">
                  <ClipboardList size={20} color="#212121" />
                </View>
                <View>
                  <Text className="text-base font-semibold text-gray-900">Inspection Progress</Text>
                  <Text className="text-xs text-gray-500">Step {currentIndex + 1} of {steps.length}</Text>
                </View>
              </View>
              <View className="bg-gray-50 px-3 py-1 rounded-full">
                <Text className="text-xs font-semibold text-gray-600">
                  {Math.round((currentIndex / steps.length) * 100)}%
                </Text>
              </View>
            </View>
          </View>
          
          {/* 2x4 Grid Layout */}
          <View className="p-4">
            {/* First Row - 4 steps */}
            <View className="flex-row items-start justify-between mb-4">
              {steps.slice(0, 4).map((step, index) => {
                const isActive = index === currentIndex;
                const isDone = index < currentIndex;
                return (
                  <TouchableOpacity 
                    key={step.id} 
                    className="items-center flex-1"
                    onPress={() => setCurrentStep(step.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`mb-2 h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm ${
                        isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : isActive
                          ? 'border-gray-900 bg-gray-900'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isDone ? (
                        <Check size={16} color="#ffffff" strokeWidth={3} />
                      ) : (
                        <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      className={`text-[9px] text-center leading-tight ${
                        isActive ? 'font-bold text-gray-900' : isDone ? 'font-semibold text-emerald-600' : 'text-gray-500'
                      }`}
                      numberOfLines={2}
                    >
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            
            {/* Second Row - 4 steps */}
            <View className="flex-row items-start justify-between">
              {steps.slice(4, 8).map((step, idx) => {
                const index = idx + 4;
                const isActive = index === currentIndex;
                const isDone = index < currentIndex;
                return (
                  <TouchableOpacity 
                    key={step.id} 
                    className="items-center flex-1"
                    onPress={() => setCurrentStep(step.id)}
                    activeOpacity={0.7}
                  >
                    <View
                      className={`mb-2 h-10 w-10 items-center justify-center rounded-full border-2 shadow-sm ${
                        isDone
                          ? 'border-emerald-500 bg-emerald-500'
                          : isActive
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300 bg-white'
                      }`}
                    >
                      {isDone ? (
                        <Check size={16} color="#ffffff" strokeWidth={3} />
                      ) : (
                        <Text className={`text-sm font-bold ${isActive ? 'text-white' : 'text-gray-500'}`}>
                          {index + 1}
                        </Text>
                      )}
                    </View>
                    <Text
                      className={`text-[9px] text-center leading-tight ${
                        isActive ? 'font-bold text-blue-600' : isDone ? 'font-semibold text-emerald-600' : 'text-gray-500'
                      }`}
                      numberOfLines={2}
                    >
                      {step.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Current Step Info */}
          <View className="mx-4 mb-4 rounded-xl bg-blue-50 p-4 border border-blue-200">
            <Text className="text-xs font-bold text-blue-900 mb-1">
              {steps[currentIndex].label}
            </Text>
            <Text className="text-[11px] text-blue-700 leading-relaxed">
              {steps[currentIndex].description}
            </Text>
          </View>
        </View>

        {/* Content Card */}
        <View className="mx-4 mb-4 rounded-2xl bg-white shadow-sm border border-gray-100 overflow-hidden">
          <View className="p-4">
            {renderContent()}
          </View>
        </View>
      </ScrollView>

      {/* Fixed Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-3 shadow-lg">
        <View className="flex-row justify-between items-center">
          <TouchableOpacity
            onPress={goPrev}
            disabled={currentIndex === 0}
            className={`flex-1 flex-row items-center justify-center rounded-xl px-4 py-3 mr-2 ${
              currentIndex === 0
                ? 'bg-gray-100'
                : 'bg-white border-2 border-gray-300'
            }`}
          >
            <ArrowLeft size={16} color={currentIndex === 0 ? '#9ca3af' : '#374151'} strokeWidth={2.5} />
            <Text
              className={`ml-2 text-sm font-bold ${
                currentIndex === 0 ? 'text-gray-400' : 'text-gray-700'
              }`}
            >
              Previous
            </Text>
          </TouchableOpacity>

          {currentStep === 'review' ? (
            <TouchableOpacity
              onPress={onComplete}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-emerald-500 px-4 py-3 ml-2 shadow-md"
            >
              <Check size={16} color="#ffffff" strokeWidth={2.5} />
              <Text className="ml-2 text-sm font-bold text-white">Complete</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={goNext}
              className="flex-1 flex-row items-center justify-center rounded-xl bg-gray-900 px-4 py-3 ml-2 shadow-md"
            >
              <Text className="mr-2 text-sm font-bold text-white">Next Step</Text>
              <ArrowRight size={16} color="#ffffff" strokeWidth={2.5} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}

