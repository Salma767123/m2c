import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, ActivityIndicator, Modal, Pressable, BackHandler } from 'react-native';
import { ArrowLeft, ArrowRight, Check, RotateCcw, AlertTriangle } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { showSuccessToast, showErrorToast } from '@/lib/toast-utils';
import qcCheckerService from '@/services/qcCheckerService';
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
import InspectionTypeDialog, { type InspectionType } from './InspectionTypeDialog';
import { useScrollNav, ScrollNavButton } from '@/components/General/ScrollNav';
import { PIValidationProvider, useInvalidFieldRegistry } from './Steps/piValidation';

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
  const scrollNav = useScrollNav();
  const invalidFields = useInvalidFieldRegistry();
  const [reviewMode, setReviewMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<AllErrors>({});
  // Physical vs virtual — chosen in the mandatory dialog before the form is usable.
  // Virtual inspections may upload photos from the gallery; physical are camera-only.
  const [inspectionType, setInspectionType] = useState<InspectionType | null>(null);

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

  // ── Form data ─────────────────────────────────────────────────────────────
  const prefilledRef = useRef<string | null>(null);
  const startedRef = useRef<string | null>(null);

  // Auto-start the inspection on mount (no selfie / GPS gate). Location is not
  // sent and start errors are ignored — the form opens straight through.
  useEffect(() => {
    if (!productId || startedRef.current === productId) return;
    startedRef.current = productId;
    qcCheckerService.startProductInspection(productId).catch(() => {
      /* ignore — start is best-effort, submission is the source of truth */
    });
  }, [productId]);

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

  // Reset the scroll-nav position whenever the active step changes, since each
  // step mounts its own ScrollView starting at the top.
  useEffect(() => {
    scrollNav.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep]);

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;

  // ── Scroll to the field that failed ───────────────────────────────────────
  // Mirrors the web form: jump to the exact field that blocked Next and pulse a
  // red ring, instead of leaving the checker to hunt for it. The node is polled
  // rather than read once — the step still has to render (and Testing has to
  // expand the collapsed group holding the failing test) before it registers.
  const scrollTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scrollToFirstError = (stepErrors: Record<string, string>) => {
    const key = Object.keys(stepErrors)[0];
    if (!key) return;
    if (scrollTimer.current) clearTimeout(scrollTimer.current);
    invalidFields.flash(key);

    let attempts = 0;
    const tryScroll = async () => {
      const node = invalidFields.getNode(key);
      if (node && (await scrollNav.scrollToNode(node))) return;
      if (attempts++ < 8) {
        scrollTimer.current = setTimeout(tryScroll, 80);
        return;
      }
      // The step never marked a specific field — the error banner is at the top.
      scrollNav.scrollToTop();
    };
    scrollTimer.current = setTimeout(tryScroll, 60);
  };

  useEffect(
    () => () => {
      if (scrollTimer.current) clearTimeout(scrollTimer.current);
    },
    [],
  );

  // ── Navigation ────────────────────────────────────────────────────────────
  const nextStep = () => {
    const stepErrors = validateStep(currentStep, formData);
    setErrors((prev) => ({ ...prev, [currentStep]: stepErrors }));
    if (hasErrors(stepErrors)) {
      showErrorToast('Please complete this step', firstErrorMessage(stepErrors) || 'Some required fields are missing.');
      scrollToFirstError(stepErrors);
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

  const handleSubmit = async () => {
    const all = validateAll(formData);
    if (Object.keys(all).length > 0) {
      setErrors(all);
      const firstInvalid = STEPS.find((s) => all[s.id])?.id;
      if (firstInvalid) {
        setReviewMode(false);
        setCurrentStep(firstInvalid);
        // The step is about to swap, so its fields have not registered yet —
        // scrollToFirstError polls, which covers the remount.
        scrollToFirstError(all[firstInvalid]!);
      }
      showErrorToast('Cannot submit yet', 'Some required fields are missing. Review the highlighted steps.');
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
      };

      // Route on the checker's ACTUAL decision from the Review step
      // (inspectionStatus). Only an explicit "Rejected" hits the reject
      // endpoint; everything else goes through approve, which derives the
      // final approvalStatus from inspectionStatus on the backend.
      const type = inspectionType ?? 'PHYSICAL';
      if (formData.inspectionStatus === 'Rejected') {
        const reason = (formData.reviewerRemarks || '').trim() || 'Rejected during QC product inspection';
        await qcCheckerService.rejectProduct(productId, reason, cleanedData, null, type);
      } else {
        await qcCheckerService.approveProduct(productId, cleanedData, null, type);
      }

      allowLeaveRef.current = true;
      showSuccessToast('Success', 'Product inspection submitted successfully.');
      onComplete();
    } catch (error: any) {
      showErrorToast('Submission Failed', error.message || 'Unable to submit inspection.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Step content ──────────────────────────────────────────────────────────
  const renderStepContent = () => {
    const props = { formData, setFormData, scrollNav: scrollNav.handlers, inspectionType };
    switch (currentStep) {
      case 'generalInformation':
        return <PI_Step1_GeneralInfo {...props} errors={errors.generalInformation || {}} />;
      case 'productVerification':
        return <PI_Step2_ProductVerification {...props} errors={errors.productVerification || {}} />;
      case 'packagingInspection':
        return <PI_Step3_PackagingInspection {...props} errors={errors.packagingInspection || {}} />;
      case 'defects':
        return <Defects {...props} errors={errors.defects || {}} />;
      case 'testing':
        return <PI_Step5_Testing {...props} errors={errors.testing || {}} />;
      case 'review':
        return <PI_Step6_Review {...props} onEditStep={handleEditStep} errors={errors.review || {}} />;
      case 'documentation':
        return <Documentation {...props} errors={errors.documentation || {}} />;
      default:
        return null;
    }
  };

  return (
    <View className="flex-1 bg-white">
      {/* Mandatory type selection — shown until the checker chooses. Cancelling
          backs out of the inspection. */}
      {!inspectionType && (
        <InspectionTypeDialog
          subjectName={productName}
          onSelect={setInspectionType}
          onCancel={onCancel}
        />
      )}

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
        <View className="mx-4 mb-2 flex-row items-center bg-brand-50 border border-brand-100 rounded-xl px-3 py-2">
          <RotateCcw size={14} color="#c41617" />
          <Text className="text-xs font-medium text-brand-700 ml-2">
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
                    stepHasErrors ? 'bg-red-50' : isActive ? 'bg-brand-50' : isPast ? 'bg-green-50' : 'bg-gray-100'
                  }`}
                  onPress={() => goToStep(step.id)}
                >
                  <View
                    className={`w-5 h-5 rounded-full items-center justify-center mr-1.5 ${
                      stepHasErrors ? 'bg-red-500' : isActive ? 'bg-brand-500' : isPast ? 'bg-green-500' : 'bg-gray-300'
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
                      stepHasErrors ? 'text-red-600' : isActive ? 'text-brand-700' : isPast ? 'text-green-700' : 'text-gray-500'
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
      <View className="flex-1 px-4">
        <PIValidationProvider register={invalidFields.register} flashKey={invalidFields.flashKey}>
          {renderStepContent()}
        </PIValidationProvider>
        <ScrollNavButton nav={scrollNav} />
      </View>

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
          <TouchableOpacity className="flex-row items-center px-5 py-2.5 bg-brand-500 rounded-xl" onPress={nextStep}>
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
              <View className="w-11 h-11 rounded-full bg-brand-50 items-center justify-center mr-3">
                <AlertTriangle size={22} color="#e01a1b" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-900">Exit inspection?</Text>
                <Text className="text-sm text-slate-600 mt-1">
                  Are you sure you want to exit? Your inspection progress will be lost and won&apos;t be saved.
                </Text>
              </View>
            </View>
            <View className="flex-row px-5 py-4 bg-slate-50 border-t border-slate-100" style={{ columnGap: 12 }}>
              <TouchableOpacity onPress={cancelExit} className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white items-center">
                <Text className="text-slate-700 font-semibold text-sm">Keep editing</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={confirmExit} className="flex-1 py-2.5 rounded-xl bg-brand-500 items-center">
                <Text className="text-white font-semibold text-sm">Yes, exit</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}
