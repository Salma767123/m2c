import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Alert, Modal, Pressable, BackHandler } from 'react-native';
import { ArrowLeft, ArrowRight, Check, RotateCcw, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import qcCheckerService from '@/services/qcCheckerService';
import SelfieCaptureModal, { SelfieResult } from '@/components/General/SelfieCaptureModal';
import { formatCheckerName } from '@/components/Vendor/Steps/fieldHelpers';

import {
  makeDefaultPackagingItems,
  makeDefaultTestGroups,
  makeDefaultAdditionalEvidence,
} from './PI_data';
import {
  validateStep,
  validateAll,
  hasErrors,
  firstErrorMessage,
  type Step,
  type AllErrors,
} from './validation';

import PI_Step1_GeneralInfo from './Steps/PI_Step1_GeneralInfo';
import PI_Step2_ProductVerification from './Steps/PI_Step2_ProductVerification';
import PI_Step3_PackagingInspection from './Steps/PI_Step3_PackagingInspection';
import Defects from './Steps/Defects';
import PI_Step5_Testing from './Steps/PI_Step5_Testing';
import PI_Step6_Review from './Steps/PI_Step6_Review';
import Documentation from './Steps/Documentation';

interface Props {
  productId: string;
  productName: string;
  vendorName: string;
  onComplete: () => void;
  onCancel: () => void;
}

const STEPS: { id: Step; label: string; description: string }[] = [
  { id: 'generalInformation', label: 'General Info', description: 'Vendor registration data and inspection context' },
  { id: 'productVerification', label: 'Product Verification', description: 'Field-level verification of all product data' },
  { id: 'packagingInspection', label: 'Packaging', description: 'Carton, retail packaging and product type' },
  { id: 'defects', label: 'Defects', description: 'AQL sampling and defect counts' },
  { id: 'testing', label: 'Testing', description: 'Comprehensive on-site test battery' },
  { id: 'review', label: 'Review', description: 'Full summary and final decision' },
  { id: 'documentation', label: 'Documentation', description: 'Report, signatures and final submit' },
];

export default function ProductInspectionForm({
  productId,
  productName,
  vendorName,
  onComplete,
  onCancel,
}: Props) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<Step>('generalInformation');
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<AllErrors>({});

  // ── Exit-confirmation guard ─────────────────────────────
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const pendingNavRef = useRef<null | (() => void)>(null);
  const allowLeaveRef = useRef(false);

  const requestExit = (action: () => void) => {
    if (allowLeaveRef.current) {
      action();
      return;
    }
    pendingNavRef.current = action;
    setShowExitConfirm(true);
  };
  const confirmExit = () => {
    setShowExitConfirm(false);
    allowLeaveRef.current = true;
    const action = pendingNavRef.current;
    pendingNavRef.current = null;
    action?.();
  };
  const cancelExit = () => {
    setShowExitConfirm(false);
    pendingNavRef.current = null;
  };

  // Android hardware back → confirm exit (disabled after submit)
  useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (allowLeaveRef.current) return false;
      requestExit(onCancel);
      return true;
    });
    return () => sub.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onCancel]);

  // ── Selfie gates ─────────────────────────────
  const [showBeforeSelfie, setShowBeforeSelfie] = useState(true);
  const [beforeSelfie, setBeforeSelfie] = useState<SelfieResult | null>(null);
  const [showAfterSelfie, setShowAfterSelfie] = useState(false);
  const [afterSelfie, setAfterSelfie] = useState<SelfieResult | null>(null);

  // ── Form data ─────────────────────────────────────────────────────────────
  const prefilledRef = useRef<string | null>(null);

  const [formData, setFormData] = useState<any>(() => ({
    // Step 1
    client: 'M2C',
    vendor: vendorName,
    serviceStartDate: new Date().toISOString().split('T')[0],
    serviceType: 'Pre-Shipment Inspection',
    vendorData: null,
    productData: null,

    // Step 2
    productVerifications: {} as Record<string, { ok: boolean | null; remarks: string }>,
    productEvidencePhotos: [] as any[],

    // Step 3
    packagingItems: makeDefaultPackagingItems(),
    packagingPhotos: [] as any[],

    // Step 4 – Defects
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

    // Step 5 – Testing
    testGroups: makeDefaultTestGroups(),
    additionalEvidence: makeDefaultAdditionalEvidence(),

    // Step 6 – Final Decision (within Review step)
    finalDecision: 'Approved',
    reviewerRemarks: '',

    // Step 7 – Documentation
    inspectorSignature: '',
    inspectionStatus: '',
    documentationPhotos: [] as any[],
    photocopyDocuments: [] as any[],
    companyIdCards: [] as any[],
    signedDocuments: [] as any[],
    signedReport: [] as any[],
    clientSignature: '',

    // Legacy compat fields
    items: [
      {
        id: 1,
        itemName: productName,
        itemDescription: 'Standard Product Assessment',
        totalQuantity: 0,
        inspectionQuantity: 0,
      },
    ] as any[],
    warehousePhotoEvidences: [] as any[],
    measurements: [] as any[],
    measurementPhotos: [] as any[],
    tests: [] as any[],
    testingPhotos: [] as any[],
    shipperCartonRemark: '',
    innerCartonRemark: '',
    retailPackagingRemark: '',
    productTypeRemark: '',
    aqlWorkmanshipRemark: '',
    onSiteTestsRemark: '',
  }));

  // ── Autofill from API ─────────────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    if (!productId || prefilledRef.current === productId) return;

    (async () => {
      const cached = await qcCheckerService.getCheckerData();
      if (cached?.name && !cancelled) {
        setFormData((prev: any) => ({
          ...prev,
          inspectorSignature: prev.inspectorSignature || formatCheckerName(cached),
        }));
      }

      try {
        const res = await qcCheckerService.getProductDetails(productId);
        if (cancelled || !res?.success) return;
        const product = res.data.product;
        const v = product?.vendor || {};

        setFormData((prev: any) => ({
          ...prev,
          vendor: prev.vendor || v.companyName || vendorName,
          vendorData: v,
          productData: product,
          inspectorSignature: product?.assignedQc ? formatCheckerName(product.assignedQc) : prev.inspectorSignature,
        }));

        prefilledRef.current = productId;
      } catch (err) {
        if (!cancelled) console.error('PI autofill failed', err);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, vendorName]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () => {
    const stepErrors = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }));
    if (hasErrors(stepErrors)) {
      showErrorToast('Please complete this step', firstErrorMessage(stepErrors) || 'Some required fields are missing.');
      return;
    }

    if (reviewMode) {
      setReviewMode(false);
      setCurrentStep('review');
      return;
    }

    if (!isLastStep) {
      setCurrentStep(STEPS[currentStepIndex + 1].id);
    }
  };

  const prevStep = () => {
    if (reviewMode) {
      setReviewMode(false);
      setCurrentStep('review');
      return;
    }
    if (currentStepIndex > 0) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const goToStep = (target: Step) => {
    const targetIndex = STEPS.findIndex((s) => s.id === target);
    if (targetIndex === -1 || targetIndex === currentStepIndex) return;
    const stepErrors = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }));
    setReviewMode(false);
    setCurrentStep(target);
  };

  // Called by Review step's Edit buttons
  const handleEditStep = (stepId: string) => {
    setReviewMode(true);
    setCurrentStep(stepId as Step);
  };

  // ── Submit ────────────────────────────────────────────────────────────────
  const cleanPhotos = (photos: any[]) => {
    if (!photos) return [];
    return photos.map((p) => ({ name: p.name || 'image.jpg', data: p.data || p.uri || p.url || null }));
  };

  const handleSubmit = async (afterSelfieOverride?: SelfieResult) => {
    const all = validateAll(formData);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstInvalid = STEPS.find((s) => all[s.id])?.id;
      if (firstInvalid) {
        setReviewMode(false);
        setCurrentStep(firstInvalid);
      }
      showErrorToast('Cannot submit yet', 'Some required fields are missing. Review the highlighted steps.');
      return;
    }

    // Require after-selfie before submit
    const resolvedAfterSelfie = afterSelfieOverride ?? afterSelfie;
    if (!resolvedAfterSelfie) {
      setShowAfterSelfie(true);
      return;
    }

    setSubmitting(true);
    try {
      const cleanedData = {
        ...formData,
        packagingPhotos: cleanPhotos(formData.packagingPhotos),
        productEvidencePhotos: cleanPhotos(formData.productEvidencePhotos),
        defectPhotos: cleanPhotos(formData.defectPhotos),
        documentationPhotos: cleanPhotos(formData.documentationPhotos),
        photocopyDocuments: cleanPhotos(formData.photocopyDocuments),
        companyIdCards: cleanPhotos(formData.companyIdCards),
        signedDocuments: cleanPhotos(formData.signedDocuments),
        signedReport: cleanPhotos(formData.signedReport),
        testGroups: (formData.testGroups || []).map((g: any) => ({
          ...g,
          tests: (g.tests || []).map((t: any) => ({
            ...t,
            rightPhotos: cleanPhotos(t.rightPhotos),
            wrongPhotos: cleanPhotos(t.wrongPhotos),
          })),
        })),
        additionalEvidence: Object.fromEntries(
          Object.entries(formData.additionalEvidence || {}).map(([k, v]) => [k, cleanPhotos(v as any[])]),
        ),
        // ── App-only additive keys (selfie + GPS) ──
        beforeSelfieTakenAt: beforeSelfie?.takenAt,
        beforeSelfiePhoto: beforeSelfie ? { name: 'before-selfie.jpg', data: beforeSelfie.dataUri } : undefined,
        afterSelfieTakenAt: resolvedAfterSelfie.takenAt,
        afterSelfiePhoto: { name: 'after-selfie.jpg', data: resolvedAfterSelfie.dataUri },
      };

      // Freshest GPS = the after-selfie location (submit-time geofence).
      const location =
        resolvedAfterSelfie.latitude != null && resolvedAfterSelfie.longitude != null
          ? { latitude: resolvedAfterSelfie.latitude, longitude: resolvedAfterSelfie.longitude }
          : null;

      if (formData.finalDecision === 'Approved') {
        await qcCheckerService.approveProduct(productId, cleanedData, location);
      } else {
        await qcCheckerService.rejectProduct(productId, formData.reviewerRemarks, cleanedData, location);
      }

      allowLeaveRef.current = true;
      showSuccessToast('Success', 'Product inspection submitted successfully.');
      onComplete();
    } catch (error: any) {
      const errData = error?.data;
      const code = errData?.error;
      if (code === 'Location mismatch' || code === 'Location required' || code === 'Vendor location not set') {
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
  };

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStepContent = () => {
    switch (currentStep) {
      case 'generalInformation':
        return <PI_Step1_GeneralInfo formData={formData} setFormData={setFormData} errors={errors.generalInformation || {}} />;
      case 'productVerification':
        return <PI_Step2_ProductVerification formData={formData} setFormData={setFormData} errors={errors.productVerification || {}} />;
      case 'packagingInspection':
        return <PI_Step3_PackagingInspection formData={formData} setFormData={setFormData} errors={errors.packagingInspection || {}} />;
      case 'defects':
        return <Defects formData={formData} setFormData={setFormData} />;
      case 'testing':
        return <PI_Step5_Testing formData={formData} setFormData={setFormData} errors={errors.testing || {}} />;
      case 'review':
        return <PI_Step6_Review formData={formData} setFormData={setFormData} onEditStep={handleEditStep} errors={errors.review || {}} />;
      case 'documentation':
        return <Documentation formData={formData} setFormData={setFormData} errors={errors.documentation || {}} />;
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
          const loc =
            result.latitude != null && result.longitude != null
              ? { latitude: result.latitude, longitude: result.longitude }
              : null;
          try {
            await qcCheckerService.startProductInspection(productId, loc);
          } catch (startErr: any) {
            const errData = startErr?.data;
            const code = errData?.error;
            if (code === 'Location mismatch' || code === 'Location required' || code === 'Vendor location not set') {
              Alert.alert(
                code === 'Location mismatch' ? '📍 Location Mismatch' : '📍 Location Error',
                errData.message || 'Location verification failed.',
                [{ text: 'Go Back', onPress: () => { allowLeaveRef.current = true; onCancel(); } }],
              );
              return;
            }
            console.warn('startProductInspection failed:', startErr?.message);
          }
          setBeforeSelfie(result);
          setShowBeforeSelfie(false);
        }}
        onCancel={() => { allowLeaveRef.current = true; onCancel(); }}
      />

      {/* After-inspection selfie gate */}
      <SelfieCaptureModal
        visible={showAfterSelfie}
        title="After Inspection Selfie"
        description="Great work! Take a final selfie to confirm you completed the product inspection on-site."
        onConfirm={(result) => {
          setAfterSelfie(result);
          setShowAfterSelfie(false);
          handleSubmit(result);
        }}
      />

      {/* Header */}
      <View className="px-4 pt-2 pb-2 flex-row items-center">
        <TouchableOpacity onPress={() => requestExit(onCancel)} className="mr-3 p-1">
          <ArrowLeft size={22} color="#334155" />
        </TouchableOpacity>
        <View className="flex-1">
          <Text className="text-base font-bold text-slate-900" numberOfLines={1}>
            Product Inspection
          </Text>
          <Text className="text-xs text-slate-500" numberOfLines={1}>
            {productName}
            {vendorName ? ` · ${vendorName}` : ''}
          </Text>
        </View>
      </View>

      {reviewMode && (
        <View className="mx-4 mb-2 flex-row items-center bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <RotateCcw size={14} color="#1d4ed8" />
          <Text className="text-xs font-medium text-blue-700 ml-2">
            Editing from Review — tap Save & Continue to return.
          </Text>
        </View>
      )}

      {/* Step Indicator */}
      <View className="px-4 pt-1 pb-2">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View className="flex-row" style={{ columnGap: 4 }}>
            {STEPS.map((step, index) => {
              const isActive = currentStep === step.id;
              const isPast = currentStepIndex > index;
              const stepHasErrors = hasErrors(errors[step.id]);
              return (
                <TouchableOpacity
                  key={step.id}
                  className={`flex-row items-center px-3 py-2 rounded-full ${
                    stepHasErrors ? 'bg-red-50' : isActive ? 'bg-blue-100' : isPast ? 'bg-green-50' : 'bg-gray-100'
                  }`}
                  onPress={() => goToStep(step.id)}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center mr-1.5 ${
                      stepHasErrors ? 'bg-red-500' : isActive ? 'bg-blue-600' : isPast ? 'bg-green-500' : 'bg-gray-300'
                    }`}
                  >
                    {stepHasErrors ? (
                      <Text className="text-[9px] text-white font-bold">!</Text>
                    ) : isPast ? (
                      <Check size={10} color="#fff" />
                    ) : (
                      <Text className="text-[9px] text-white font-bold">{index + 1}</Text>
                    )}
                  </View>
                  <Text
                    className={`text-xs font-medium ${
                      stepHasErrors ? 'text-red-600' : isActive ? 'text-blue-700' : isPast ? 'text-green-700' : 'text-gray-500'
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

      {/* Step title/description */}
      <View className="px-4 pb-2">
        <Text className="text-[11px] text-slate-500">
          Step {currentStepIndex + 1} of {STEPS.length} · {STEPS[currentStepIndex].description}
        </Text>
      </View>

      {/* Form Content */}
      <View className="flex-1 px-4">{renderStepContent()}</View>

      {/* Bottom Navigation */}
      <View
        className="px-4 pt-3 border-t border-gray-200 bg-gray-50 flex-row items-center justify-between"
        style={{ paddingBottom: Math.max(insets.bottom, 12) + 4 }}
      >
        <TouchableOpacity
          className="px-4 py-2.5 rounded-xl border border-gray-300 bg-white flex-row items-center"
          onPress={prevStep}
          disabled={currentStepIndex === 0 && !reviewMode}
          style={{ opacity: currentStepIndex === 0 && !reviewMode ? 0.4 : 1 }}
        >
          <ArrowLeft size={16} color="#374151" />
          <Text className="text-gray-700 font-medium text-sm ml-1">{reviewMode ? 'Back to Review' : 'Previous'}</Text>
        </TouchableOpacity>

        {isLastStep && !reviewMode ? (
          <TouchableOpacity
            className="flex-row items-center px-5 py-2.5 bg-emerald-600 rounded-xl"
            onPress={() => handleSubmit()}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Check size={16} color="#fff" />
                <Text className="text-white font-semibold text-sm ml-1">Submit Inspection</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity className="flex-row items-center px-5 py-2.5 bg-blue-600 rounded-xl" onPress={nextStep}>
            <Text className="text-white font-semibold text-sm mr-1">{reviewMode ? 'Save & Continue' : 'Next'}</Text>
            <ArrowRight size={16} color="#fff" />
          </TouchableOpacity>
        )}
      </View>

      {/* Exit-confirmation modal */}
      <Modal visible={showExitConfirm} transparent animationType="fade" onRequestClose={cancelExit}>
        <Pressable className="flex-1 bg-black/50 items-center justify-center px-6" onPress={cancelExit}>
          <Pressable className="bg-white rounded-2xl overflow-hidden w-full max-w-md" onPress={(e) => e.stopPropagation()}>
            <View className="p-5 flex-row items-start">
              <View className="w-11 h-11 rounded-full bg-blue-50 items-center justify-center mr-3">
                <AlertTriangle size={22} color="#2563eb" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Exit inspection?</Text>
                <Text className="text-sm text-slate-600 mt-1">
                  Are you sure you want to exit? Your inspection progress will be lost and won't be saved.
                </Text>
              </View>
            </View>
            <View className="flex-row px-5 py-4 bg-slate-50 border-t border-slate-100" style={{ columnGap: 12 }}>
              <TouchableOpacity onPress={cancelExit} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center">
                <Text className="text-slate-700 font-semibold text-sm">Keep editing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmExit} className="flex-1 py-2.5 rounded-xl bg-blue-600 items-center">
                <Text className="text-white font-semibold text-sm">Yes, exit</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
