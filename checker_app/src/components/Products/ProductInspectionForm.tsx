import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react-native';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import qcCheckerService from '@/services/qcCheckerService';
import SelfieCaptureModal, { SelfieResult } from '@/components/General/SelfieCaptureModal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const DEFAULT_TESTS = [
  { id: 'dropTestResult', label: 'Carton Drop Test', detail: 'Action and result views' },
  { id: 'colorFastnessDry', label: 'Color Fastness (Dry)', detail: 'Dry cloth rubbing test' },
  { id: 'colorFastnessWet', label: 'Color Fastness (Wet)', detail: 'Wet cloth rubbing test' },
  { id: 'seamStrengthResult', label: 'Seam Strength Test', detail: 'Pull gauge testing' },
  { id: 'smellCheck', label: 'Smell Check', detail: 'Unusual odor detection' },
].map((t) => ({ ...t, pass: false, fail: false, photos: [], rightPhotos: [], wrongPhotos: [] }));

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
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<Step>('generalInformation');
  const [submitting, setSubmitting] = useState(false);

  // ── Selfie gates ─────────────────────────────
  const [showBeforeSelfie, setShowBeforeSelfie] = useState(true);
  const [beforeSelfie, setBeforeSelfie] = useState<SelfieResult | null>(null);
  const [showAfterSelfie, setShowAfterSelfie] = useState(false);
  const [afterSelfie, setAfterSelfie] = useState<SelfieResult | null>(null);

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

    // Testing — pre-seeded so the step renders on first open
    tests: DEFAULT_TESTS as any[],
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

  // Snapshot of which fields the server supplied — used by GeneralInformation
  // to lock prefilled fields readonly so checkers can't accidentally overwrite.
  const [autofillSnapshot, setAutofillSnapshot] = useState<Record<string, boolean>>({});
  const prefilledRef = useRef<string | null>(null);

  useEffect(() => {
    if (!productId || prefilledRef.current === productId) return;
    let cancelled = false;

    (async () => {
      const cached = await qcCheckerService.getCheckerData();
      if (cached?.name && !cancelled) {
        setFormData((prev) => ({
          ...prev,
          inspectorSignature: prev.inspectorSignature || cached.name,
        }));
      }
      try {
        const res = await qcCheckerService.getProductDetails(productId);
        if (cancelled || !res?.success) return;
        const v = res.data.product?.vendor || {};
        const factoryName = v.companyName || '';
        const serviceLocation = [v.factoryCity, v.factoryState].filter(Boolean).join(', ');
        const has = (s?: string | null) => typeof s === 'string' && s.trim() !== '';

        setFormData((prev) => ({
          ...prev,
          factory: prev.factory || factoryName,
          serviceLocation: prev.serviceLocation || serviceLocation,
        }));

        setAutofillSnapshot({
          client: true,
          vendor: has(vendorName),
          factory: has(factoryName),
          serviceLocation: has(serviceLocation),
        });

        prefilledRef.current = productId;
      } catch (err) {
        if (!cancelled) console.error('Autofill failed:', err);
      }
    })();

    return () => { cancelled = true; };
  }, [productId, vendorName]);

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
          for (const it of formData.items) {
            if (!(typeof it?.itemName === 'string' && it.itemName.trim())) {
              errs.itemName = 'Item name is required'; break;
            }
            const total = Number(it?.totalQuantity);
            const inspection = Number(it?.inspectionQuantity);
            if (!(total > 0)) { errs.totalQuantity = 'Total quantity must be greater than zero'; break; }
            if (!(inspection > 0)) { errs.inspectionQuantity = 'Inspection quantity must be greater than zero'; break; }
            if (inspection > total) { errs.inspectionQuantity = 'Inspection quantity cannot exceed total quantity'; break; }
          }
        }
        reqArr('warehousePhotoEvidences', formData.warehousePhotoEvidences, 'Upload at least one warehouse photo');
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
        // Intentionally lenient — zero-defect inspection is valid.
        // Counts default to 0, so this step never blocks Next.
        break;

      case 'testing':
        // Every test must be decided (Pass or Fail).
        // Pass requires at least one rightPhoto; Fail requires at least one wrongPhoto.
        for (const t of (formData.tests || [])) {
          const decided = t?.pass === true || t?.fail === true;
          if (!decided) {
            errs.tests = `"${t?.label || 'Test'}" requires a Pass or Fail decision`;
            break;
          }
          if (t.pass && (!Array.isArray(t.rightPhotos) || t.rightPhotos.length === 0)) {
            errs.tests = `"${t.label}" passed — upload at least one Correct photo`;
            break;
          }
          if (t.fail && (!Array.isArray(t.wrongPhotos) || t.wrongPhotos.length === 0)) {
            errs.tests = `"${t.label}" failed — upload at least one Incorrect photo`;
            break;
          }
        }
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

  const handleSubmit = async (afterSelfieOverride?: SelfieResult) => {
    // Full sweep before submission
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

    // Require after-selfie before showing confirm dialog
    const resolvedAfterSelfie = afterSelfieOverride ?? afterSelfie;
    if (!resolvedAfterSelfie) {
      setShowAfterSelfie(true);
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
                beforeSelfieTakenAt: beforeSelfie?.takenAt,
                beforeSelfiePhoto: beforeSelfie
                  ? { name: 'before-selfie.jpg', data: beforeSelfie.dataUri }
                  : undefined,
                afterSelfieTakenAt: resolvedAfterSelfie.takenAt,
                afterSelfiePhoto: { name: 'after-selfie.jpg', data: resolvedAfterSelfie.dataUri },
              };

              // The after-selfie was taken moments before submit, so its GPS
              // is the freshest checker location for the factory geofence.
              const location =
                resolvedAfterSelfie.latitude != null && resolvedAfterSelfie.longitude != null
                  ? { latitude: resolvedAfterSelfie.latitude, longitude: resolvedAfterSelfie.longitude }
                  : null;

              if (formData.finalDecision === 'Approved') {
                await qcCheckerService.approveProduct(productId, cleanedData, location);
              } else {
                await qcCheckerService.rejectProduct(
                  productId,
                  formData.reviewerRemarks,
                  cleanedData,
                  location,
                );
              }
              showSuccessToast('Success', 'Product inspection completed and submitted successfully.');
              onComplete();
            } catch (error: any) {
              // Surface the three geofence errors clearly — the vendor-inspection
              // flow uses the same shapes, so users get a consistent experience.
              const errData = error?.data;
              const code = errData?.error;
              if (
                code === 'Location mismatch' ||
                code === 'Location required' ||
                code === 'Vendor location not set'
              ) {
                Alert.alert(
                  code === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
                  errData.message || 'Location verification failed.',
                  [{ text: 'OK' }],
                );
              } else {
                showErrorToast('Submission Failed', error.message || 'Unable to submit inspection.');
              }
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
        return <GeneralInformation {...p} autofillSnapshot={autofillSnapshot} />;
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
      {/* Before-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showBeforeSelfie}
        title="Before Inspection Selfie"
        description="Take a selfie to verify your presence before starting the product inspection. This is mandatory."
        onConfirm={async (result) => {
          // Pre-flight geofence — mirrors factory startInspection so the
          // backend logs both sides of the comparison at the moment the
          // checker begins. Blocks the form from opening when the checker
          // is not at the vendor's factory.
          const loc =
            result.latitude != null && result.longitude != null
              ? { latitude: result.latitude, longitude: result.longitude }
              : null;
          try {
            await qcCheckerService.startProductInspection(productId, loc);
          } catch (startErr: any) {
            const errData = startErr?.data;
            const code = errData?.error;
            if (
              code === 'Location mismatch' ||
              code === 'Location required' ||
              code === 'Vendor location not set'
            ) {
              Alert.alert(
                code === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
                errData.message || 'Location verification failed.',
                [{ text: 'Go Back', onPress: onCancel }],
              );
              return;
            }
            // Non-location errors — log but don't block the inspection
            console.warn('startProductInspection failed:', startErr?.message);
          }
          setBeforeSelfie(result);
          setShowBeforeSelfie(false);
        }}
        onCancel={onCancel}
      />

      {/* After-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showAfterSelfie}
        title="After Inspection Selfie"
        description="Great work! Take a final selfie to confirm you completed the product inspection on-site."
        onConfirm={(result) => {
          setAfterSelfie(result);
          setShowAfterSelfie(false);
          // Pass result directly to avoid stale closure on afterSelfie state
          handleSubmit(result);
        }}
      />
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

      {/* Bottom Navigation — safe-area aware (same compact formula the
          vendor inspection form uses, so the buttons sit close to the
          edge without leaving a big gap below). */}
      <View
        className="px-4 pt-3 border-t border-gray-200 bg-gray-50 flex-row items-center justify-between"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      >
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
              onPress={() => handleSubmit()}
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
