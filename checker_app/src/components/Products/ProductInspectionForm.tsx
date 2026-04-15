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

  // Tracks which steps the user has already tried to advance from.
  // Inline errors only render on steps the user has "attempted" — avoids
  // red borders the first time a step is viewed.
  const [attempted, setAttempted] = useState<Set<Step>>(new Set());
  const markAttempted = (step: Step) =>
    setAttempted((prev) => {
      if (prev.has(step)) return prev;
      const next = new Set(prev);
      next.add(step);
      return next;
    });

  // Returns fieldName -> error message. Keys are the same names used inside
  // each step component so inline rendering lights up the right field.
  const validateStep = (step: Step): Record<string, string> => {
    const errs: Record<string, string> = {};
    const reqStr = (k: string, v: any, msg: string) => {
      if (!(typeof v === 'string' && v.trim().length > 0)) errs[k] = msg;
    };
    const reqNum = (k: string, v: any, msg: string) => {
      if (!(typeof v === 'number' && v > 0)) errs[k] = msg;
    };
    const reqArr = (k: string, v: any, msg: string) => {
      if (!(Array.isArray(v) && v.length > 0)) errs[k] = msg;
    };

    switch (step) {
      case 'generalInformation':
        reqStr('client', formData.client, 'Client is required');
        reqStr('vendor', formData.vendor, 'Vendor is required');
        reqStr('factory', formData.factory, 'Factory is required');
        reqStr('serviceLocation', formData.serviceLocation, 'Service location is required');
        reqStr('serviceStartDate', formData.serviceStartDate, 'Service start date is required');
        reqStr('serviceType', formData.serviceType, 'Select a service type');
        break;

      case 'preparation':
        if (!Array.isArray(formData.items) || formData.items.length === 0) {
          errs.items = 'Add at least one item';
        } else {
          formData.items.forEach((it: any, i: number) => {
            reqStr(`items.${i}.itemName`, it.itemName, 'Item name is required');
            reqStr(`items.${i}.itemDescription`, it.itemDescription, 'Description is required');
            reqNum(`items.${i}.totalQuantity`, Number(it.totalQuantity), 'Must be greater than 0');
            reqNum(`items.${i}.inspectionQuantity`, Number(it.inspectionQuantity), 'Must be greater than 0');
            reqStr(`items.${i}.status`, it.status, 'Status is required');
          });
        }
        reqArr('warehousePhotoEvidences', formData.warehousePhotoEvidences, 'Add at least one photo');
        break;

      case 'measurements':
        reqArr('measurements', formData.measurements, 'Add at least one measurement');
        (formData.measurements || []).forEach((m: any, i: number) => {
          const hasAny = Object.values(m || {}).some(
            (v) => v !== undefined && v !== null && String(v).trim() !== '',
          );
          if (!hasAny) errs[`measurements.${i}`] = 'Fill in the details';
        });
        reqArr('measurementPhotos', formData.measurementPhotos, 'Add at least one photo');
        break;

      case 'packaging':
        reqStr('shipperCartonRemark', formData.shipperCartonRemark, 'Required');
        reqStr('innerCartonRemark', formData.innerCartonRemark, 'Required');
        reqStr('retailPackagingRemark', formData.retailPackagingRemark, 'Required');
        reqStr('productTypeRemark', formData.productTypeRemark, 'Required');
        reqStr('aqlWorkmanshipRemark', formData.aqlWorkmanshipRemark, 'Required');
        reqStr('onSiteTestsRemark', formData.onSiteTestsRemark, 'Required');
        reqArr('packagingPhotos', formData.packagingPhotos, 'Add at least one photo');
        break;

      case 'defects':
        reqStr('inspectionLevel', formData.inspectionLevel, 'Select an inspection level');
        reqNum('sampleSize', Number(formData.sampleSize), 'Sample size must be greater than 0');
        if (Number(formData.criticalDefects) > 0)
          reqStr('criticalDefectDetails', formData.criticalDefectDetails, 'Describe the critical defects');
        if (Number(formData.majorDefects) > 0)
          reqStr('majorDefectDetails', formData.majorDefectDetails, 'Describe the major defects');
        if (Number(formData.minorDefects) > 0)
          reqStr('minorDefectDetails', formData.minorDefectDetails, 'Describe the minor defects');
        reqArr('defectPhotos', formData.defectPhotos, 'Add at least one photo');
        break;

      case 'testing':
        reqArr('tests', formData.tests, 'Add at least one test');
        (formData.tests || []).forEach((t: any, i: number) => {
          // Each seeded test needs Pass or Fail marked (exclusive, set via toggles)
          if (!t.pass && !t.fail) {
            errs[`tests.${i}.result`] = 'Mark Pass or Fail';
          }
        });
        reqArr('testingPhotos', formData.testingPhotos, 'Add at least one photo');
        break;

      case 'documentation':
        reqStr('inspectorSignature', formData.inspectorSignature, 'Signature is required');
        reqArr('documentationPhotos', formData.documentationPhotos, 'Add at least one photo');
        reqArr('photocopyDocuments', formData.photocopyDocuments, 'Add at least one document');
        reqArr('companyIdCards', formData.companyIdCards, 'Add at least one ID card');
        break;

      case 'review':
        reqStr('finalDecision', formData.finalDecision, 'Pick a final decision');
        if (formData.finalDecision === 'Rejected')
          reqStr('reviewerRemarks', formData.reviewerRemarks, 'Rejection remarks are required');
        break;
    }
    return errs;
  };

  const currentErrors = validateStep(currentStep);
  const showErrors = attempted.has(currentStep);
  const errorCount = Object.keys(currentErrors).length;

  const nextStep = () => {
    if (isLastStep) return;
    if (errorCount > 0) {
      markAttempted(currentStep);
      return;
    }
    setCurrentStep(STEPS[currentStepIndex + 1].id);
  };

  const prevStep = () => {
    if (currentStepIndex > 0) setCurrentStep(STEPS[currentStepIndex - 1].id);
  };

  const jumpToStep = (targetStep: Step) => {
    const targetIdx = STEPS.findIndex((s) => s.id === targetStep);
    if (targetIdx <= currentStepIndex) {
      setCurrentStep(targetStep);
      return;
    }
    for (let i = currentStepIndex; i < targetIdx; i++) {
      const errs = validateStep(STEPS[i].id);
      if (Object.keys(errs).length > 0) {
        setCurrentStep(STEPS[i].id);
        markAttempted(STEPS[i].id);
        return;
      }
    }
    setCurrentStep(targetStep);
  };

  const cleanPhotos = (photos: any[]) => {
    if (!photos) return [];
    return photos.map((p) => ({
      name: p.name || 'image.jpg',
      data: p.data || p.uri || p.url || null,
    }));
  };

  const handleSubmit = async () => {
    // Full sweep before submission — reveal inline errors on every step that
    // has any, and jump to the first one so the user can fix it.
    const invalidSteps = STEPS.filter(
      (s) => Object.keys(validateStep(s.id)).length > 0,
    );
    if (invalidSteps.length > 0) {
      setAttempted((prev) => {
        const next = new Set(prev);
        invalidSteps.forEach((s) => next.add(s.id));
        return next;
      });
      setCurrentStep(invalidSteps[0].id);
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

  const stepErrors = showErrors ? currentErrors : {};

  const renderStepContent = () => {
    const p = { formData, setFormData, errors: stepErrors } as any;
    switch (currentStep) {
      case 'generalInformation':
        return <GeneralInformation {...p} />;
      case 'preparation':
        return <Preparation {...p} />;
      case 'measurements':
        return <Measurements {...p} />;
      case 'packaging':
        return <Packaging {...p} />;
      case 'defects':
        return <Defects {...p} />;
      case 'testing':
        return <Testing {...p} />;
      case 'documentation':
        return <Documentation {...p} />;
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
                  onPress={() => jumpToStep(step.id)}
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
                className={`rounded-xl px-4 py-3 bg-white text-sm text-gray-900 min-h-[70px] border ${
                  stepErrors.reviewerRemarks ? 'border-red-400' : 'border-gray-300'
                }`}
                value={formData.reviewerRemarks}
                onChangeText={(val) => setFormData({ ...formData, reviewerRemarks: val })}
                placeholder="Enter reason for rejection..."
                multiline
                textAlignVertical="top"
              />
              {stepErrors.reviewerRemarks ? (
                <Text className="text-xs text-red-600 mt-1">
                  {stepErrors.reviewerRemarks}
                </Text>
              ) : null}
            </View>
          )}
        </View>
      )}

      {/* Required-fields hint */}
      <View className="px-4 pt-1 pb-2">
        <Text className="text-[11px] text-slate-500">
          <Text className="text-red-500 font-bold">*</Text> All fields on this
          step are required to continue.
        </Text>
      </View>

      {/* Inline banner — only after the user hit Next on an invalid step */}
      {showErrors && errorCount > 0 ? (
        <View className="mx-4 mt-2 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5 flex-row items-start">
          <View className="w-5 h-5 rounded-full bg-red-500 items-center justify-center mr-2 mt-0.5">
            <Text className="text-white text-[10px] font-bold">!</Text>
          </View>
          <Text className="text-xs text-red-700 flex-1 leading-4">
            <Text className="font-bold">
              {errorCount} {errorCount === 1 ? 'field needs' : 'fields need'} your attention.
            </Text>{' '}
            Review the highlighted fields to continue.
          </Text>
        </View>
      ) : null}

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
