import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import qcCheckerService from '@/services/qcCheckerService';

import GeneralInformation from './Steps/GeneralInformation';
import Preparation from './Steps/Preparation';
import Measurements from './Steps/Measurements';
import Packaging from './Steps/Packaging';
import Defects from './Steps/Defects';
import Testing from './Steps/Testing';
import Documentation from './Steps/Documentation';
import Review from './Steps/Review';

interface ProductInspectionFormProps {
  productId: string;
  productName: string;
  vendorName: string;
  onComplete: () => void;
  onCancel: () => void;
}

type Step =
  | 'generalInformation'
  | 'preparation'
  | 'measurements'
  | 'packaging'
  | 'defects'
  | 'testing'
  | 'documentation'
  | 'review';

const STEPS: { id: Step; label: string }[] = [
  { id: 'generalInformation', label: 'General Information' },
  { id: 'preparation', label: 'Preparation' },
  { id: 'measurements', label: 'Measurements' },
  { id: 'packaging', label: 'Packaging' },
  { id: 'defects', label: 'Defects' },
  { id: 'testing', label: 'Testing' },
  { id: 'documentation', label: 'Documentation' },
  { id: 'review', label: 'Review & Sign-Off' },
];

export default function ProductInspectionForm({
  productId,
  productName,
  vendorName,
  onComplete,
  onCancel,
}: ProductInspectionFormProps) {
  const [currentStep, setCurrentStep] = useState<Step>('generalInformation');
  const [submitting, setSubmitting] = useState(false);

  const [formData, setFormData] = useState({
    // General Information
    client: 'M2C',
    vendor: vendorName,
    factory: '',
    serviceLocation: '',
    serviceStartDate: new Date().toISOString().split('T')[0],
    serviceType: 'Pre-Shipment Inspection',

    // Preparation
    items: [
      {
        id: 1,
        itemName: productName,
        itemDescription: 'Standard Product Assessment',
        totalQuantity: 0,
        inspectionQuantity: 0,
        status: 'Pending',
      },
    ],
    warehousePhotoEvidences: [] as any[],

    // Measurements
    measurements: [] as any[],
    measurementPhotos: [] as any[],

    // Packaging
    shipperCartonRemark: '',
    innerCartonRemark: '',
    retailPackagingRemark: '',
    productTypeRemark: '',
    aqlWorkmanshipRemark: '',
    onSiteTestsRemark: '',
    packagingPhotos: [] as any[],

    // Defects
    inspectionLevel: 'L-II',
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
    criticalDefectDetails: '',
    majorDefectDetails: '',
    minorDefectDetails: '',
    defectPhotos: [] as any[],

    // Testing
    tests: [] as any[],
    testingPhotos: [] as any[],

    // Documentation
    inspectorSignature: '',
    documentationPhotos: [] as any[],
    photocopyDocuments: [] as any[],
    companyIdCards: [] as any[],

    // Review / Final Decision
    finalDecision: 'Approved',
    reviewerRemarks: '',
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  const nextStep = () => {
    if (!isLastStep) setCurrentStep(STEPS[currentStepIndex + 1].id);
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1].id);
  };

  const cleanPhotos = (photos: any[]) => {
    if (!photos) return [];
    return photos.map((p) => ({
      name: p.name || 'image.jpg',
      data: p.data || p.uri || p.url || null,
    }));
  };

  const handleSubmit = async () => {
    if (formData.finalDecision === 'Rejected' && !formData.reviewerRemarks) {
      showErrorToast('Error', 'Rejection remarks are required.');
      return;
    }

    Alert.alert(
      'Submit Inspection',
      `Are you sure you want to ${formData.finalDecision === 'Approved' ? 'approve' : 'reject'} this product?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(true);
            try {
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
                tests: (formData.tests || []).map((test: any) => ({
                  ...test,
                  photos: cleanPhotos(test.photos),
                  rightPhotos: cleanPhotos(test.rightPhotos),
                  wrongPhotos: cleanPhotos(test.wrongPhotos),
                })),
              };

              if (formData.finalDecision === 'Approved') {
                await qcCheckerService.approveProduct(productId, cleanedData);
              } else {
                await qcCheckerService.rejectProduct(productId, formData.reviewerRemarks, cleanedData);
              }
              showSuccessToast('Success', 'Product inspection completed and submitted successfully.');
              onComplete();
            } catch (error: any) {
              showErrorToast('Submission Failed', error.message || 'Unable to submit inspection.');
            } finally {
              setSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 'generalInformation':
        return <GeneralInformation formData={formData} setFormData={setFormData} />;
      case 'preparation':
        return <Preparation formData={formData} setFormData={setFormData} />;
      case 'measurements':
        return <Measurements formData={formData} setFormData={setFormData} />;
      case 'packaging':
        return <Packaging formData={formData} setFormData={setFormData} />;
      case 'defects':
        return <Defects formData={formData} setFormData={setFormData} />;
      case 'testing':
        return <Testing formData={formData} setFormData={setFormData} />;
      case 'documentation':
        return <Documentation formData={formData} setFormData={setFormData} />;
      case 'review':
        return <Review formData={formData as any} />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Step Indicator */}
      <View className="px-4 pt-4 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row gap-1">
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = currentStepIndex > index;
              return (
                <TouchableOpacity
                  key={step.id}
                  className={`flex-row items-center px-3 py-2 rounded-full ${
                    isActive
                      ? 'bg-blue-100'
                      : isPast
                      ? 'bg-green-50'
                      : 'bg-gray-100'
                  }`}
                  onPress={() => setCurrentStep(step.id)}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center mr-1.5 ${
                      isActive
                        ? 'bg-blue-600'
                        : isPast
                        ? 'bg-green-500'
                        : 'bg-gray-300'
                    }`}
                  >
                    {isPast ? (
                      <Check size={10} color="#fff" />
                    ) : (
                      <Text className="text-[9px] text-white font-bold">{index + 1}</Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs font-medium ${
                      isActive ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-500'
                    }`}
                    numberOfLines={1}
                  >
                    {step.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Final Decision (only on review step) */}
      {currentStep === 'review' && (
        <View className="px-4 py-3 border-b border-gray-200">
          <Text className="text-sm font-bold text-gray-900 mb-2">Final Decision</Text>
          <View className="flex-row gap-3">
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center border ${
                formData.finalDecision === 'Approved'
                  ? 'bg-green-100 border-green-400'
                  : 'bg-white border-gray-300'
              }`}
              onPress={() => setFormData({ ...formData, finalDecision: 'Approved' })}
            >
              <Text
                className={`text-sm font-bold ${
                  formData.finalDecision === 'Approved' ? 'text-green-700' : 'text-gray-600'
                }`}
              >
                Approve
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              className={`flex-1 py-3 rounded-xl items-center border ${
                formData.finalDecision === 'Rejected'
                  ? 'bg-red-100 border-red-400'
                  : 'bg-white border-gray-300'
              }`}
              onPress={() => setFormData({ ...formData, finalDecision: 'Rejected' })}
            >
              <Text
                className={`text-sm font-bold ${
                  formData.finalDecision === 'Rejected' ? 'text-red-700' : 'text-gray-600'
                }`}
              >
                Reject
              </Text>
            </TouchableOpacity>
          </View>

          {formData.finalDecision === 'Rejected' && (
            <View className="mt-3">
              <Text className="text-xs text-gray-500 font-semibold mb-1">
                Rejection Remarks <Text className="text-red-500">*</Text>
              </Text>
              <TextInput
                className="border border-gray-300 rounded-xl px-4 py-3 bg-white text-sm text-gray-900 min-h-[70px]"
                value={formData.reviewerRemarks}
                onChangeText={(val) => setFormData({ ...formData, reviewerRemarks: val })}
                placeholder="Enter reason for rejection..."
                multiline
                textAlignVertical="top"
              />
            </View>
          )}
        </View>
      )}

      {/* Form Content */}
      <View className="flex-1 px-4 pt-2">{renderStepContent()}</View>

      {/* Bottom Navigation */}
      <View className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex-row items-center justify-between">
        <TouchableOpacity
          className="px-4 py-2.5 rounded-xl"
          onPress={onCancel}
        >
          <Text className="text-gray-600 font-medium text-sm">Cancel</Text>
        </TouchableOpacity>

        <View className="flex-row gap-3">
          {currentStepIndex > 0 && (
            <TouchableOpacity
              className="flex-row items-center px-4 py-2.5 border border-gray-300 bg-white rounded-xl"
              onPress={prevStep}
            >
              <ArrowLeft size={16} color="#374151" />
              <Text className="text-gray-700 font-medium text-sm ml-1">Previous</Text>
            </TouchableOpacity>
          )}

          {isLastStep ? (
            <TouchableOpacity
              className="flex-row items-center px-5 py-2.5 bg-blue-600 rounded-xl"
              onPress={handleSubmit}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text className="text-white font-semibold text-sm">Submit</Text>
                  <Check size={16} color="#fff" />
                </>
              )}
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              className="flex-row items-center px-5 py-2.5 bg-gray-900 rounded-xl"
              onPress={nextStep}
            >
              <Text className="text-white font-semibold text-sm">Next</Text>
              <ArrowRight size={16} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </View>
  );
}
